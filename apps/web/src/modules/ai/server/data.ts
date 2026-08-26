import "server-only";

import { cache } from "react";

import type {
  AIRunRow,
  OrganizationAIPolicyRow,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getOrganizationAIPolicy = cache(
  async (organizationId: string): Promise<OrganizationAIPolicyRow | null> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("organization_ai_policies")
      .select(
        "allowed_provider_ids, created_at, default_tier, execution_mode, monthly_remote_cost_limit_usd, organization_id, updated_at, updated_by",
      )
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw new Error("Organization AI policy could not be loaded");
    return data;
  },
);

export const getOrganizationAIRuns = cache(
  async (organizationId: string): Promise<AIRunRow[]> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("ai_runs")
      .select(
        "actor_id, capability, completed_at, duration_ms, error_category, estimated_cost_usd, id, input_tokens, is_remote, memory_domains, operation, organization_id, output_tokens, parent_run_id, plugin_id, provider_id, requested_tier, selected_model_id, started_at, status, total_tokens, trace_metadata",
      )
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("AI run history could not be loaded");
    return data ?? [];
  },
);

export async function getOrganizationMonthlyRemoteSpend(
  organizationId: string,
  now = new Date(),
) {
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "get_organization_ai_remote_spend",
    { p_organization_id: organizationId, p_since: since },
  );
  if (error) throw new Error("Organization AI usage could not be loaded");
  return Number(data ?? 0);
}
