import { describe, expect, it } from "vitest";

import {
  AIModelRegistry,
  estimateModelCostUsd,
  type AIModelDefinition,
} from "./model-registry";

export function model(
  overrides: Partial<AIModelDefinition> = {},
): AIModelDefinition {
  return {
    capabilities: { structuredOutput: true, tools: false },
    contextWindow: 32_000,
    costClass: "free",
    enabled: true,
    id: "local-fast",
    location: "local",
    logicalTiers: ["fast"],
    priority: 100,
    providerId: "fake-local",
    providerModel: "fake-model",
    ...overrides,
  };
}

describe("AIModelRegistry", () => {
  it("registers and deterministically orders enabled models", () => {
    const registry = new AIModelRegistry([
      model({ id: "second", priority: 200 }),
      model({ id: "first", priority: 100 }),
      model({ enabled: false, id: "disabled", priority: 1 }),
    ]);
    expect(registry.list().map((entry) => entry.id)).toEqual([
      "disabled",
      "first",
      "second",
    ]);
    expect(registry.listEnabled().map((entry) => entry.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("rejects duplicate model IDs", () => {
    expect(() => new AIModelRegistry([model(), model()])).toThrow(
      /Duplicate AI model/,
    );
  });

  it("keeps unknown usage unknown and estimates configured remote cost", () => {
    expect(
      estimateModelCostUsd(
        model({
          location: "remote",
          pricing: {
            inputUsdPerMillionTokens: 1,
            outputUsdPerMillionTokens: 2,
          },
        }),
        { inputTokens: null, outputTokens: null },
      ),
    ).toBeNull();
    expect(
      estimateModelCostUsd(
        model({
          location: "remote",
          pricing: {
            inputUsdPerMillionTokens: 1,
            outputUsdPerMillionTokens: 2,
          },
        }),
        { inputTokens: 1_000, outputTokens: 500 },
      ),
    ).toBeCloseTo(0.002);
  });
});
