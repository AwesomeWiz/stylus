import "server-only";

import type { AIUsage } from "@/core/ai/public";
import { AIError, type AIErrorCategory } from "@/modules/ai/errors";

import type {
  AIProviderAdapter,
  ProviderGenerationRequest,
  ProviderGenerationResult,
} from "./contracts";

export type FakeProviderStep =
  | { error: AIErrorCategory }
  | {
      delayMs?: number;
      finishReason?: string | null;
      text: string;
      usage?: Partial<AIUsage>;
    };

export class FakeAIProvider implements AIProviderAdapter {
  calls: ProviderGenerationRequest[] = [];
  healthChecks = 0;

  constructor(
    readonly id: string,
    private readonly steps: FakeProviderStep[],
    private readonly available = true,
  ) {}

  async generate(request: ProviderGenerationRequest) {
    this.calls.push(request);
    if (request.signal.aborted) throw request.signal.reason;
    const step = this.steps.shift();
    if (!step) throw new AIError("provider_unavailable");
    if ("error" in step) throw new AIError(step.error);
    if (step.delayMs)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, step.delayMs);
        request.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(request.signal.reason);
          },
          { once: true },
        );
      });
    return {
      finishReason: step.finishReason ?? "stop",
      providerRequestId: `fake-${this.calls.length}`,
      text: step.text,
      usage: {
        inputTokens: step.usage?.inputTokens ?? null,
        outputTokens: step.usage?.outputTokens ?? null,
        totalTokens: step.usage?.totalTokens ?? null,
      },
    } satisfies ProviderGenerationResult;
  }

  async healthCheck() {
    this.healthChecks += 1;
    return this.available;
  }
}
