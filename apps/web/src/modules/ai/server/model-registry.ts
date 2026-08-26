import "server-only";

import type { AILogicalTier } from "@/core/ai/public";

export type AIModelLocation = "local" | "remote";
export type AIModelCostClass = "free" | "low" | "medium" | "high";

export interface AIModelDefinition {
  capabilities: {
    structuredOutput: boolean;
    tools: boolean;
  };
  contextWindow: number | null;
  costClass: AIModelCostClass;
  enabled: boolean;
  id: string;
  location: AIModelLocation;
  logicalTiers: readonly AILogicalTier[];
  pricing?: {
    inputUsdPerMillionTokens: number;
    outputUsdPerMillionTokens: number;
  };
  priority: number;
  providerId: string;
  providerModel: string;
}

export class AIModelRegistry {
  readonly #models = new Map<string, Readonly<AIModelDefinition>>();

  constructor(models: AIModelDefinition[] = []) {
    models.forEach((model) => this.register(model));
  }

  register(model: AIModelDefinition) {
    if (this.#models.has(model.id))
      throw new Error(`Duplicate AI model ID: ${model.id}`);
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(model.id))
      throw new Error(`Invalid AI model ID: ${model.id}`);
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(model.providerId))
      throw new Error(`Invalid AI provider ID: ${model.providerId}`);
    if (!model.logicalTiers.length)
      throw new Error(`AI model "${model.id}" requires a logical tier.`);
    const normalized = Object.freeze({ ...model });
    this.#models.set(model.id, normalized);
    return this;
  }

  get(modelId: string) {
    return this.#models.get(modelId);
  }

  list() {
    return [...this.#models.values()].sort(
      (left, right) =>
        left.priority - right.priority || left.id.localeCompare(right.id),
    );
  }

  listEnabled() {
    return this.list().filter((model) => model.enabled);
  }
}

export function estimateModelCostUsd(
  model: AIModelDefinition,
  usage: { inputTokens: number | null; outputTokens: number | null },
) {
  if (model.location === "local") return 0;
  if (
    !model.pricing ||
    usage.inputTokens === null ||
    usage.outputTokens === null
  )
    return null;
  return (
    (usage.inputTokens / 1_000_000) * model.pricing.inputUsdPerMillionTokens +
    (usage.outputTokens / 1_000_000) * model.pricing.outputUsdPerMillionTokens
  );
}
