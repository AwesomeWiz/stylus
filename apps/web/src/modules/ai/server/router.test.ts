import { describe, expect, it } from "vitest";

import { AIError } from "@/modules/ai/errors";

import { AIModelRegistry } from "./model-registry";
import { model } from "./model-registry.test";
import { AIModelRouter, type OrganizationAIRoutingPolicy } from "./router";

const policy: OrganizationAIRoutingPolicy = {
  allowedProviderIds: [],
  defaultTier: "fast",
  executionMode: "remote_allowed",
  monthlyRemoteCostLimitUsd: null,
  remoteCostSpentUsd: 0,
};

describe("AIModelRouter", () => {
  const registry = new AIModelRegistry([
    model({ id: "local-fast", logicalTiers: ["fast"], priority: 100 }),
    model({
      id: "local-reasoning",
      logicalTiers: ["reasoning"],
      priority: 100,
    }),
    model({
      id: "remote-fast",
      costClass: "medium",
      location: "remote",
      logicalTiers: ["fast"],
      priority: 200,
      providerId: "fake-remote",
    }),
    model({
      capabilities: { structuredOutput: false, tools: false },
      id: "no-json",
      priority: 50,
    }),
  ]);
  const router = new AIModelRouter(registry);

  it("routes fast and reasoning tiers deterministically", () => {
    expect(
      router.route({ policy, tier: "fast" }).candidates.map((m) => m.id),
    ).toEqual(["no-json", "local-fast", "remote-fast"]);
    expect(router.route({ policy, tier: "reasoning" }).candidates[0]?.id).toBe(
      "local-reasoning",
    );
  });

  it("respects structured capability and provider allowlists", () => {
    expect(
      router
        .route({ policy, requireStructuredOutput: true, tier: "fast" })
        .candidates.map((m) => m.id),
    ).toEqual(["local-fast", "remote-fast"]);
    expect(
      router
        .route({
          policy: { ...policy, allowedProviderIds: ["fake-remote"] },
        })
        .candidates.map((m) => m.id),
    ).toEqual(["remote-fast"]);
  });

  it("never includes remote fallback under local_only", () => {
    expect(
      router
        .route({
          policy: { ...policy, executionMode: "local_only" },
        })
        .candidates.every((candidate) => candidate.location === "local"),
    ).toBe(true);
  });

  it("blocks paid remote routing before execution when the budget is reached", () => {
    expect(() =>
      router.route({
        policy: {
          ...policy,
          allowedProviderIds: ["fake-remote"],
          monthlyRemoteCostLimitUsd: 5,
          remoteCostSpentUsd: 5,
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<AIError>>({
        category: "budget_exceeded",
      }),
    );
  });

  it("does not treat a configured zero-cost remote model as paid usage", () => {
    const freeRemote = new AIModelRouter(
      new AIModelRegistry([
        model({
          costClass: "free",
          id: "free-remote",
          location: "remote",
          providerId: "free-provider",
        }),
      ]),
    );
    expect(
      freeRemote.route({
        policy: {
          ...policy,
          monthlyRemoteCostLimitUsd: 0,
          remoteCostSpentUsd: 0,
        },
      }).candidates[0]?.id,
    ).toBe("free-remote");
  });

  it("rejects disabled organization AI", () => {
    expect(() =>
      router.route({ policy: { ...policy, executionMode: "disabled" } }),
    ).toThrowError(
      expect.objectContaining<Partial<AIError>>({
        category: "policy_denied",
      }),
    );
  });
});
