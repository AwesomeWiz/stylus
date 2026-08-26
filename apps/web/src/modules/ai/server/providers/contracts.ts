import "server-only";

import type { AIMessage, AIUsage } from "@/core/ai/public";

export interface ProviderGenerationRequest {
  maxOutputTokens: number;
  messages: readonly AIMessage[];
  model: string;
  signal: AbortSignal;
  structuredOutput?: {
    jsonSchema: unknown;
    name: string;
  };
  temperature?: number;
}

export interface ProviderGenerationResult {
  finishReason: string | null;
  providerRequestId: string | null;
  text: string;
  usage: AIUsage;
}

export interface AIProviderAdapter {
  readonly id: string;
  generate(
    request: ProviderGenerationRequest,
  ): Promise<ProviderGenerationResult>;
  healthCheck(signal: AbortSignal): Promise<boolean>;
}

export interface ProviderHealthSnapshot {
  available: boolean;
  checkedAt: number;
}

export class ProviderHealthCache {
  readonly #values = new Map<string, ProviderHealthSnapshot>();

  constructor(private readonly ttlMs = 30_000) {}

  async check(provider: AIProviderAdapter, signal: AbortSignal) {
    const cached = this.#values.get(provider.id);
    if (cached && Date.now() - cached.checkedAt < this.ttlMs)
      return cached.available;
    const available = await provider.healthCheck(signal).catch(() => false);
    this.#values.set(provider.id, { available, checkedAt: Date.now() });
    return available;
  }
}
