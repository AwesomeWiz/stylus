import "server-only";

import type { AILogicalTier } from "@/core/ai/public";
import { AIError } from "@/modules/ai/errors";

import type { AIModelDefinition, AIModelRegistry } from "./model-registry";

export interface OrganizationAIRoutingPolicy {
  allowedProviderIds: readonly string[];
  defaultTier: AILogicalTier;
  executionMode: "disabled" | "local_only" | "remote_allowed";
  monthlyRemoteCostLimitUsd: number | null;
  remoteCostSpentUsd: number;
}

export interface AIModelRoute {
  candidates: readonly AIModelDefinition[];
  reason: string;
  tier: AILogicalTier;
}

export class AIModelRouter {
  constructor(private readonly registry: AIModelRegistry) {}

  route(input: {
    policy: OrganizationAIRoutingPolicy;
    requireStructuredOutput?: boolean;
    requireTools?: boolean;
    tier?: AILogicalTier;
  }): AIModelRoute {
    const tier = input.tier ?? input.policy.defaultTier;
    if (input.policy.executionMode === "disabled")
      throw new AIError("policy_denied");
    const allowedProviders = new Set(input.policy.allowedProviderIds);
    const candidates = this.registry.listEnabled().filter((model) => {
      if (!model.logicalTiers.includes(tier)) return false;
      if (input.requireStructuredOutput && !model.capabilities.structuredOutput)
        return false;
      if (input.requireTools && !model.capabilities.tools) return false;
      if (allowedProviders.size > 0 && !allowedProviders.has(model.providerId))
        return false;
      if (
        input.policy.executionMode === "local_only" &&
        model.location !== "local"
      )
        return false;
      if (
        model.location === "remote" &&
        model.costClass !== "free" &&
        input.policy.monthlyRemoteCostLimitUsd !== null &&
        input.policy.remoteCostSpentUsd >=
          input.policy.monthlyRemoteCostLimitUsd
      )
        return false;
      return true;
    });
    if (!candidates.length) {
      const budgetReached =
        input.policy.monthlyRemoteCostLimitUsd !== null &&
        input.policy.remoteCostSpentUsd >=
          input.policy.monthlyRemoteCostLimitUsd;
      throw new AIError(budgetReached ? "budget_exceeded" : "policy_denied");
    }
    return {
      candidates,
      reason: `Selected ${tier} candidates in configured priority order under ${input.policy.executionMode} policy.`,
      tier,
    };
  }
}
