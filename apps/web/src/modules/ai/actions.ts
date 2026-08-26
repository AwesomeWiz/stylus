"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canManageOrganization } from "@/modules/organizations/authorization";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import {
  aiPolicySchema,
  initialAIPolicyActionState,
  type AIPolicyActionState,
} from "./schemas";
import { getConfiguredAIProviderIds } from "./server/configured";

export async function updateOrganizationAIPolicyAction(
  _state: AIPolicyActionState = initialAIPolicyActionState,
  formData: FormData,
): Promise<AIPolicyActionState> {
  void _state;
  const parsed = aiPolicySchema.safeParse({
    allowedProviderIds: formData.getAll("allowedProviderIds"),
    defaultTier: formData.get("defaultTier"),
    executionMode: formData.get("executionMode"),
    monthlyRemoteCostLimitUsd: formData.get("monthlyRemoteCostLimitUsd"),
  });
  if (!parsed.success)
    return { message: "Review the AI policy values.", status: "error" };
  const configuredProviders = new Set(getConfiguredAIProviderIds());
  if (
    parsed.data.allowedProviderIds.some(
      (providerId) => !configuredProviders.has(providerId),
    )
  )
    return { message: "The provider selection is invalid.", status: "error" };
  try {
    const context = await getCurrentOrganizationContext();
    if (!context || !canManageOrganization(context.membership.role))
      return {
        message: "You do not have permission to manage AI policy.",
        status: "error",
      };
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("set_organization_ai_policy", {
      p_allowed_provider_ids: parsed.data.allowedProviderIds,
      p_default_tier: parsed.data.defaultTier,
      p_execution_mode: parsed.data.executionMode,
      p_monthly_remote_cost_limit_usd: parsed.data.monthlyRemoteCostLimitUsd,
      p_organization_id: context.organization.id,
    });
    if (error)
      return { message: "The AI policy could not be saved.", status: "error" };
    revalidatePath("/ai");
    return { message: "AI policy saved.", status: "success" };
  } catch {
    return { message: "The AI policy could not be saved.", status: "error" };
  }
}
