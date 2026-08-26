import "server-only";

import type { createServerSupabaseClient } from "@/lib/supabase/server";

import type { AIRunCompletion, AIRunStart, AIRunStore } from "./run-store";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

const tierToRecord = {
  balanced: "BALANCED",
  fast: "FAST",
  reasoning: "REASONING",
} as const;

export class SupabaseAIRunStore implements AIRunStore {
  constructor(private readonly supabase: ServerSupabaseClient) {}

  async start(input: AIRunStart) {
    const { error } = await this.supabase.rpc("start_ai_run", {
      p_capability: input.context.capability,
      p_id: input.context.runId,
      p_memory_domains: [...input.context.memoryDomains],
      p_operation: input.operation,
      p_organization_id: input.context.organizationId,
      p_parent_run_id: input.parentRunId ?? null,
      p_plugin_id: input.context.pluginId,
      p_requested_tier: tierToRecord[input.requestedTier],
      p_trace_metadata: { ...input.trace },
    });
    if (error) throw new Error("AI run could not be started");
  }

  async complete(input: AIRunCompletion) {
    const { error } = await this.supabase.rpc("complete_ai_run", {
      p_duration_ms: input.durationMs,
      p_error_category: input.errorCategory,
      p_estimated_cost_usd: input.estimatedCostUsd,
      p_id: input.runId,
      p_input_tokens: input.usage.inputTokens,
      p_is_remote: input.isRemote,
      p_organization_id: input.organizationId,
      p_output_tokens: input.usage.outputTokens,
      p_provider_id: input.providerId,
      p_selected_model_id: input.modelId,
      p_status: input.status,
      p_total_tokens: input.usage.totalTokens,
      p_trace_metadata: { ...input.trace },
    });
    if (error) throw new Error("AI run result could not be saved");
  }
}
