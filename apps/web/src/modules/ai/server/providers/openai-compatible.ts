import "server-only";

import { z } from "zod";

import { AIError } from "@/modules/ai/errors";

import type {
  AIProviderAdapter,
  ProviderGenerationRequest,
  ProviderGenerationResult,
} from "./contracts";

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
  id: z.string().optional(),
  usage: z
    .object({
      completion_tokens: z.number().int().nonnegative().optional(),
      prompt_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export function normalizeProviderBaseUrl(value: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("AI provider base URL is invalid.");
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

function endpoint(baseUrl: string, path: string) {
  const base = new URL(`${baseUrl}/`);
  const basePath = base.pathname.replace(/\/$/, "");
  const endpointPath =
    basePath.endsWith("/v1") && path.startsWith("/v1/") ? path.slice(3) : path;
  base.pathname = `${basePath}${endpointPath}`.replace(/\/+/g, "/");
  return base.toString();
}

const OLLAMA_GRAMMAR_MAX_REPETITION = 2_000;

export function ollamaCompatibleJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(ollamaCompatibleJsonSchema);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(
    Object.entries(schema).flatMap(([key, value]) =>
      key === "maxLength" &&
      typeof value === "number" &&
      value >= OLLAMA_GRAMMAR_MAX_REPETITION
        ? []
        : [[key, ollamaCompatibleJsonSchema(value)]],
    ),
  );
}

function httpError(status: number, structuredOutput: boolean) {
  if (status === 401 || status === 403)
    return new AIError("authentication_failed");
  if (status === 429) return new AIError("rate_limited");
  if (status === 408 || status >= 500)
    return new AIError("provider_unavailable");
  if (status === 400 && structuredOutput)
    return new AIError("invalid_response");
  if (status === 400 || status === 413) return new AIError("context_limit");
  return new AIError("unknown");
}

export class OpenAICompatibleProvider implements AIProviderAdapter {
  readonly baseUrl: string;

  constructor(
    readonly id: string,
    options: {
      apiKey?: string;
      baseUrl: string;
      fetch?: typeof fetch;
      healthPath?: string;
    },
  ) {
    this.apiKey = options.apiKey;
    this.baseUrl = normalizeProviderBaseUrl(options.baseUrl);
    this.fetchImplementation = options.fetch ?? fetch;
    this.healthPath = options.healthPath ?? "/v1/models";
  }

  private readonly apiKey?: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly healthPath: string;

  async generate(
    request: ProviderGenerationRequest,
  ): Promise<ProviderGenerationResult> {
    const structuredOutput =
      request.structuredOutput && this.id === "ollama"
        ? {
            ...request.structuredOutput,
            jsonSchema: ollamaCompatibleJsonSchema(
              request.structuredOutput.jsonSchema,
            ),
          }
        : request.structuredOutput;
    let response: Response;
    try {
      response = await this.fetchImplementation(
        endpoint(this.baseUrl, "/v1/chat/completions"),
        {
          body: JSON.stringify({
            max_tokens: request.maxOutputTokens,
            messages: request.messages,
            model: request.model,
            ...(structuredOutput
              ? {
                  response_format: {
                    json_schema: {
                      name: structuredOutput.name,
                      schema: structuredOutput.jsonSchema,
                      strict: true,
                    },
                    type: "json_schema",
                  },
                }
              : {}),
            ...(request.temperature === undefined
              ? {}
              : { temperature: request.temperature }),
          }),
          headers: {
            "content-type": "application/json",
            ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
          },
          method: "POST",
          signal: request.signal,
        },
      );
    } catch (error) {
      if (request.signal.aborted) throw error;
      throw new AIError("provider_unavailable", { cause: error });
    }
    if (!response.ok)
      throw httpError(response.status, Boolean(structuredOutput));
    const raw = await response.text();
    if (raw.length > 1_000_000) throw new AIError("invalid_response");
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      throw new AIError("invalid_response", { cause: error });
    }
    const parsed = responseSchema.safeParse(parsedJson);
    if (!parsed.success) throw new AIError("invalid_response");
    const usage = parsed.data.usage;
    return {
      finishReason: parsed.data.choices[0]!.finish_reason ?? null,
      providerRequestId: parsed.data.id ?? null,
      text: parsed.data.choices[0]!.message.content,
      usage: {
        inputTokens: usage?.prompt_tokens ?? null,
        outputTokens: usage?.completion_tokens ?? null,
        totalTokens: usage?.total_tokens ?? null,
      },
    };
  }

  async healthCheck(signal: AbortSignal) {
    try {
      const response = await this.fetchImplementation(
        endpoint(this.baseUrl, this.healthPath),
        {
          headers: this.apiKey
            ? { authorization: `Bearer ${this.apiKey}` }
            : undefined,
          method: "GET",
          signal,
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
