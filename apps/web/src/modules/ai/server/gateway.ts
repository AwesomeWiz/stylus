import "server-only";

import { z } from "zod";

import type {
  AIExecutionContext,
  AIGenerationOptions,
  AIStructuredResult,
  AITextResult,
  AIUsage,
} from "@/core/ai/public";
import {
  AIError,
  isRetryableAIError,
  normalizeAIError,
} from "@/modules/ai/errors";

import { estimateModelCostUsd } from "./model-registry";
import type { AIProviderAdapter } from "./providers/contracts";
import type { AIRunStore, AIRunTerminalStatus } from "./run-store";
import type { AIModelRouter, OrganizationAIRoutingPolicy } from "./router";

const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 1;

interface GatewayRequest {
  context: AIExecutionContext;
  options: AIGenerationOptions;
  parentRunId?: string | null;
  policy: OrganizationAIRoutingPolicy;
}

interface StructuredGatewayRequest<T> extends GatewayRequest {
  schema: z.ZodType<T>;
  schemaName: string;
}

function validateOptions(options: AIGenerationOptions) {
  const messages = z
    .array(
      z.object({
        content: z.string().min(1).max(100_000),
        role: z.enum(["system", "user", "assistant"]),
      }),
    )
    .min(1)
    .max(100)
    .parse(options.messages);
  const maxOutputTokens = z
    .number()
    .int()
    .min(1)
    .max(32_768)
    .parse(options.maxOutputTokens ?? 1_024);
  const temperature =
    options.temperature === undefined
      ? undefined
      : z.number().min(0).max(2).parse(options.temperature);
  const timeoutMs = z
    .number()
    .int()
    .min(MIN_TIMEOUT_MS)
    .max(MAX_TIMEOUT_MS)
    .parse(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  return { maxOutputTokens, messages, temperature, timeoutMs };
}

function createAttemptSignal(
  external: AbortSignal | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timedOut = false;
  const onCancel = () => controller.abort(external?.reason);
  if (external?.aborted) onCancel();
  else external?.addEventListener("abort", onCancel, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error("AI request timeout"));
  }, timeoutMs);
  return {
    cleanup() {
      clearTimeout(timer);
      external?.removeEventListener("abort", onCancel);
    },
    isTimedOut: () => timedOut,
    signal: controller.signal,
  };
}

function terminalStatus(error: AIError): AIRunTerminalStatus {
  if (error.category === "cancelled") return "CANCELLED";
  if (error.category === "timeout") return "TIMED_OUT";
  return "FAILED";
}

const unknownUsage: AIUsage = {
  inputTokens: null,
  outputTokens: null,
  totalTokens: null,
};

function structuredValidationDiagnostic(error: z.ZodError) {
  const issues = error.issues.slice(0, 5).map((issue) => {
    const path = issue.path.slice(0, 6).map(String).join(".") || "$";
    return `${issue.code}@${path}`;
  });
  return `structured_output_validation_failed:${issues.join(",")}`.slice(
    0,
    500,
  );
}

function indicatesTruncation(finishReason: string | null) {
  return finishReason === "length" || finishReason === "max_tokens";
}

export class ModelGateway {
  readonly #providers: ReadonlyMap<string, AIProviderAdapter>;

  constructor(
    private readonly router: AIModelRouter,
    providers: Iterable<AIProviderAdapter>,
    private readonly runs: AIRunStore,
  ) {
    const mapped = new Map<string, AIProviderAdapter>();
    for (const provider of providers) {
      if (mapped.has(provider.id))
        throw new Error(`Duplicate AI provider ID: ${provider.id}`);
      mapped.set(provider.id, provider);
    }
    this.#providers = mapped;
  }

  async generateText(request: GatewayRequest): Promise<AITextResult> {
    return this.execute(request, "generate_text");
  }

  async generateStructured<T>(
    request: StructuredGatewayRequest<T>,
  ): Promise<AIStructuredResult<T>> {
    let structuredData: T | undefined;
    const result = await this.execute(
      request,
      "generate_structured",
      {
        jsonSchema: z.toJSONSchema(request.schema),
        name: z
          .string()
          .regex(/^[a-z][a-z0-9_]{1,49}$/)
          .parse(request.schemaName),
      },
      (text) => {
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch (error) {
          throw new AIError("invalid_response", {
            cause: error,
            diagnostic: "structured_output_malformed_json",
          });
        }
        const parsed = request.schema.safeParse(json);
        if (!parsed.success)
          throw new AIError("invalid_response", {
            cause: parsed.error,
            diagnostic: structuredValidationDiagnostic(parsed.error),
          });
        structuredData = parsed.data;
      },
    );
    return { ...result, data: structuredData! };
  }

  private async execute(
    request: GatewayRequest,
    operation: "generate_text" | "generate_structured",
    structuredOutput?: { jsonSchema: unknown; name: string },
    validateText?: (text: string) => void,
  ): Promise<AITextResult> {
    const startedAt = Date.now();
    const options = validateOptions(request.options);
    const tier = request.options.tier ?? request.policy.defaultTier;
    await this.runs.start({
      context: request.context,
      operation,
      parentRunId: request.parentRunId,
      requestedTier: tier,
      trace: {
        memoryDomains: [...request.context.memoryDomains],
        messageCount: options.messages.length,
        promptContentStored: false,
        executionMode: request.policy.executionMode,
        structuredOutput: Boolean(structuredOutput),
      },
    });
    let selectedModelId: string | null = null;
    let selectedProviderId: string | null = null;
    let selectedIsRemote: boolean | null = null;
    let lastError = new AIError("provider_unavailable");
    let lastFinishReason: string | null = null;
    let lastUsage = unknownUsage;
    const attempts: string[] = [];
    try {
      const route = this.router.route({
        policy: request.policy,
        requireStructuredOutput: Boolean(structuredOutput),
        tier,
      });
      for (const model of route.candidates) {
        const provider = this.#providers.get(model.providerId);
        if (!provider) continue;
        selectedModelId = model.id;
        selectedProviderId = model.providerId;
        selectedIsRemote = model.location === "remote";
        for (let retry = 0; retry <= MAX_RETRIES; retry += 1) {
          const attempt = createAttemptSignal(
            request.options.signal,
            options.timeoutMs,
          );
          attempts.push(`${model.id}:${retry + 1}`);
          try {
            const providerResult = await provider.generate({
              maxOutputTokens: options.maxOutputTokens,
              messages: options.messages,
              model: model.providerModel,
              signal: attempt.signal,
              structuredOutput,
              temperature: options.temperature,
            });
            lastFinishReason = providerResult.finishReason;
            lastUsage = providerResult.usage;
            try {
              validateText?.(providerResult.text);
            } catch (rawError) {
              const validationError = normalizeAIError(rawError);
              if (
                validationError.category === "invalid_response" &&
                indicatesTruncation(providerResult.finishReason)
              ) {
                throw new AIError("invalid_response", {
                  cause: validationError,
                  diagnostic: "structured_output_truncated",
                });
              }
              throw validationError;
            }
            const estimatedCostUsd = estimateModelCostUsd(
              model,
              providerResult.usage,
            );
            await this.runs.complete({
              durationMs: Date.now() - startedAt,
              errorCategory: null,
              estimatedCostUsd,
              isRemote: model.location === "remote",
              modelId: model.id,
              organizationId: request.context.organizationId,
              providerId: model.providerId,
              runId: request.context.runId,
              status: "SUCCEEDED",
              trace: {
                attempts,
                finishReason: providerResult.finishReason,
                selectionReason: route.reason,
              },
              usage: providerResult.usage,
            });
            return {
              estimatedCostUsd,
              finishReason: providerResult.finishReason,
              modelId: model.id,
              providerId: model.providerId,
              runId: request.context.runId,
              text: providerResult.text,
              usage: providerResult.usage,
            };
          } catch (rawError) {
            lastError = attempt.isTimedOut()
              ? new AIError("timeout")
              : request.options.signal?.aborted
                ? new AIError("cancelled")
                : normalizeAIError(rawError);
            if (!isRetryableAIError(lastError) || retry === MAX_RETRIES) break;
          } finally {
            attempt.cleanup();
          }
        }
        if (!isRetryableAIError(lastError)) break;
      }
      throw lastError;
    } catch (rawError) {
      const error = normalizeAIError(rawError);
      await this.runs.complete({
        durationMs: Date.now() - startedAt,
        errorCategory: error.category,
        estimatedCostUsd: null,
        isRemote: selectedIsRemote,
        modelId: selectedModelId,
        organizationId: request.context.organizationId,
        providerId: selectedProviderId,
        runId: request.context.runId,
        status: terminalStatus(error),
        trace: {
          attempts,
          ...(error.diagnostic ? { failureDiagnostic: error.diagnostic } : {}),
          ...(lastFinishReason ? { finishReason: lastFinishReason } : {}),
        },
        usage: lastUsage,
      });
      throw error;
    }
  }
}
