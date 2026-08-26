import "server-only";

import type { z } from "zod";

import type { AIGenerationOptions } from "@/core/ai/public";
import type {
  OrganizationAIPolicyRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AIError } from "@/modules/ai/errors";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import { builtInPluginRegistry } from "@/plugins";

import { createConfiguredModelGateway } from "./configured";
import {
  getOrganizationAIPolicy,
  getOrganizationMonthlyRemoteSpend,
} from "./data";
import { SupabaseAIRunStore } from "./supabase-run-store";

const tierFromRecord = {
  BALANCED: "balanced",
  FAST: "fast",
  REASONING: "reasoning",
} as const;

const modeFromRecord = {
  DISABLED: "disabled",
  LOCAL_ONLY: "local_only",
  REMOTE_ALLOWED: "remote_allowed",
} as const;

export function authorizeAIExecution(input: {
  capability: string;
  enabledPluginIds: Iterable<string>;
  pluginId: string | null;
  policy: OrganizationAIPolicyRow | null;
  removedAt: string | null;
  role: OrganizationRole;
}) {
  if (!input.policy || input.policy.execution_mode === "DISABLED")
    throw new AIError("policy_denied");
  if (input.removedAt !== null || input.role === "VIEWER")
    throw new AIError("policy_denied");
  if (input.pluginId === null) {
    if (!input.capability.startsWith("core."))
      throw new AIError("policy_denied");
    return { memoryDomains: [] as const };
  }
  const plugin = builtInPluginRegistry.get(input.pluginId);
  if (
    !plugin ||
    !new Set(input.enabledPluginIds).has(input.pluginId) ||
    !plugin.manifest.capabilities.includes(input.capability)
  )
    throw new AIError("policy_denied");
  return { memoryDomains: plugin.manifest.memoryDomains };
}

interface TrustedAIRequest {
  capability: string;
  options: AIGenerationOptions;
  parentRunId?: string | null;
  pluginId?: string;
}

async function prepareExecution(input: TrustedAIRequest) {
  const organizationContext = await getCurrentOrganizationContext();
  if (!organizationContext) throw new AIError("policy_denied");
  const [policy, enabledPluginIds, remoteCostSpentUsd] = await Promise.all([
    getOrganizationAIPolicy(organizationContext.organization.id),
    getEnabledOrganizationPluginIds(organizationContext.organization.id),
    getOrganizationMonthlyRemoteSpend(organizationContext.organization.id),
  ]);
  const authorization = authorizeAIExecution({
    capability: input.capability,
    enabledPluginIds,
    pluginId: input.pluginId ?? null,
    policy,
    removedAt: organizationContext.membership.removed_at,
    role: organizationContext.membership.role,
  });
  const supabase = await createServerSupabaseClient();
  const gateway = createConfiguredModelGateway(
    new SupabaseAIRunStore(supabase),
  );
  return {
    context: {
      actorId: organizationContext.user.id,
      capability: input.capability,
      memoryDomains: authorization.memoryDomains,
      organizationId: organizationContext.organization.id,
      pluginId: input.pluginId ?? null,
      runId: crypto.randomUUID(),
    },
    gateway,
    policy: {
      allowedProviderIds: policy!.allowed_provider_ids,
      defaultTier: tierFromRecord[policy!.default_tier],
      executionMode: modeFromRecord[policy!.execution_mode],
      monthlyRemoteCostLimitUsd: policy!.monthly_remote_cost_limit_usd,
      remoteCostSpentUsd,
    },
  };
}

export async function generateAIText(input: TrustedAIRequest) {
  const prepared = await prepareExecution(input);
  return prepared.gateway.generateText({
    context: prepared.context,
    options: input.options,
    parentRunId: input.parentRunId,
    policy: prepared.policy,
  });
}

export async function generateAIStructured<T>(
  input: TrustedAIRequest & { schema: z.ZodType<T>; schemaName: string },
) {
  const prepared = await prepareExecution(input);
  return prepared.gateway.generateStructured({
    context: prepared.context,
    options: input.options,
    parentRunId: input.parentRunId,
    policy: prepared.policy,
    schema: input.schema,
    schemaName: input.schemaName,
  });
}
