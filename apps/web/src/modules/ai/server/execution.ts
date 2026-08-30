import "server-only";

import type { z } from "zod";

import type { AIGenerationOptions } from "@/core/ai/public";
import type {
  OrganizationAIPolicyRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
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
import type { AIRunCompletion, AIRunStart, AIRunStore } from "./run-store";

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

class TrustedJobAIRunStore implements AIRunStore {
  constructor(
    private readonly jobId: string,
    private readonly workflow: "reel" | "research",
    private readonly service: ReturnType<typeof createServiceSupabaseClient>,
  ) {}
  async start(input: AIRunStart) {
    const args = {
      p_capability: input.context.capability,
      p_id: input.context.runId,
      p_job_id: this.jobId,
      p_operation: input.operation,
      p_requested_tier: tierToRecordForTrusted[input.requestedTier],
      p_trace_metadata: { ...input.trace },
    };
    const { error } =
      this.workflow === "research"
        ? await this.service.rpc(
            "start_marketing_external_research_ai_run",
            args,
          )
        : await this.service.rpc("start_marketing_reel_ai_run", args);
    if (error) throw new AIError("unknown");
  }
  async complete(input: AIRunCompletion) {
    const args = {
      p_duration_ms: input.durationMs,
      p_error_category: input.errorCategory,
      p_estimated_cost_usd: input.estimatedCostUsd,
      p_id: input.runId,
      p_input_tokens: input.usage.inputTokens,
      p_is_remote: input.isRemote,
      p_job_id: this.jobId,
      p_output_tokens: input.usage.outputTokens,
      p_provider_id: input.providerId,
      p_selected_model_id: input.modelId,
      p_status: input.status,
      p_total_tokens: input.usage.totalTokens,
      p_trace_metadata: { ...input.trace },
    };
    const { error } =
      this.workflow === "research"
        ? await this.service.rpc(
            "complete_marketing_external_research_ai_run",
            args,
          )
        : await this.service.rpc("complete_marketing_reel_ai_run", args);
    if (error) throw new AIError("unknown");
  }
}

const tierToRecordForTrusted = {
  balanced: "BALANCED",
  fast: "FAST",
  reasoning: "REASONING",
} as const;

const trustedJobContracts = {
  "marketing.competitor-reels.analyze": {
    jobType: "marketing.competitor-reel.extract",
    workflow: "reel",
  },
  "marketing.external-research.execute": {
    jobType: "marketing.external-research.run",
    workflow: "research",
  },
} as const;

export async function generateAIStructuredForTrustedJob<T>(input: {
  actorId: string;
  capability: string;
  jobId: string;
  options: AIGenerationOptions;
  organizationId: string;
  pluginId: string;
  schema: z.ZodType<T>;
  schemaName: string;
}) {
  const contract =
    trustedJobContracts[input.capability as keyof typeof trustedJobContracts];
  if (!contract) throw new AIError("policy_denied");
  const service = createServiceSupabaseClient();
  const month = new Date();
  month.setUTCDate(1);
  month.setUTCHours(0, 0, 0, 0);
  const [jobResult, membershipResult, policyResult, pluginResult, spendResult] =
    await Promise.all([
      service
        .from("jobs")
        .select("created_by, organization_id, plugin_id, job_type, status")
        .eq("id", input.jobId)
        .maybeSingle(),
      service
        .from("memberships")
        .select("role, removed_at")
        .eq("organization_id", input.organizationId)
        .eq("user_id", input.actorId)
        .maybeSingle(),
      service
        .from("organization_ai_policies")
        .select("*")
        .eq("organization_id", input.organizationId)
        .maybeSingle(),
      service
        .from("organization_plugins")
        .select("enabled")
        .eq("organization_id", input.organizationId)
        .eq("plugin_id", input.pluginId)
        .maybeSingle(),
      service
        .from("ai_runs")
        .select("estimated_cost_usd")
        .eq("organization_id", input.organizationId)
        .eq("status", "SUCCEEDED")
        .eq("is_remote", true)
        .gte("started_at", month.toISOString()),
    ]);
  const membership = membershipResult.data;
  const policy = policyResult.data;
  if (
    jobResult.error ||
    membershipResult.error ||
    policyResult.error ||
    pluginResult.error ||
    spendResult.error ||
    !membership ||
    !policy ||
    !pluginResult.data?.enabled ||
    !jobResult.data ||
    jobResult.data.organization_id !== input.organizationId ||
    jobResult.data.created_by !== input.actorId ||
    jobResult.data.plugin_id !== input.pluginId ||
    jobResult.data.job_type !== contract.jobType ||
    jobResult.data.status !== "RUNNING"
  )
    throw new AIError("policy_denied");
  const authorization = authorizeAIExecution({
    capability: input.capability,
    enabledPluginIds: [input.pluginId],
    pluginId: input.pluginId,
    policy,
    removedAt: membership.removed_at,
    role: membership.role,
  });
  const remoteCostSpentUsd = (spendResult.data ?? []).reduce(
    (total, row) => total + Number(row.estimated_cost_usd ?? 0),
    0,
  );
  const gateway = createConfiguredModelGateway(
    new TrustedJobAIRunStore(input.jobId, contract.workflow, service),
  );
  return gateway.generateStructured({
    context: {
      actorId: input.actorId,
      capability: input.capability,
      memoryDomains: authorization.memoryDomains,
      organizationId: input.organizationId,
      pluginId: input.pluginId,
      runId: crypto.randomUUID(),
    },
    options: input.options,
    policy: {
      allowedProviderIds: policy.allowed_provider_ids,
      defaultTier: tierFromRecord[policy.default_tier],
      executionMode: modeFromRecord[policy.execution_mode],
      monthlyRemoteCostLimitUsd: policy.monthly_remote_cost_limit_usd,
      remoteCostSpentUsd,
    },
    schema: input.schema,
    schemaName: input.schemaName,
  });
}
