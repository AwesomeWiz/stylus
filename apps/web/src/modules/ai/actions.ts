"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeAIError } from "@/modules/ai/errors";
import { canManageOrganization } from "@/modules/organizations/authorization";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import {
  aiPolicySchema,
  type AIConnectionTestActionState,
  initialAIPolicyActionState,
  type AIPolicyActionState,
} from "./schemas";
import { getConfiguredAIProviderIds } from "./server/configured";
import { generateAIText } from "./server/execution";

const connectionTestRequest = {
  capability: "core.ai.connection-test",
  options: {
    maxOutputTokens: 8,
    messages: [{ content: "Reply exactly OK.", role: "user" as const }],
    temperature: 0,
    tier: "fast" as const,
    timeoutMs: 15_000,
  },
} as const;

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

export async function testAIConnectionAction(
  _state: AIConnectionTestActionState,
  _formData: FormData,
): Promise<AIConnectionTestActionState> {
  void _state;
  void _formData;
  const startedAt = Date.now();
  try {
    const result = await generateAIText(connectionTestRequest);
    revalidatePath("/ai");
    return {
      durationMs: Date.now() - startedAt,
      message: "AI connection succeeded.",
      modelId: result.modelId,
      providerId: result.providerId,
      status: "success",
    };
  } catch (error) {
    const normalized = normalizeAIError(error);
    revalidatePath("/ai");
    return {
      durationMs: Date.now() - startedAt,
      errorCategory: normalized.category,
      message: normalized.message,
      status: "error",
    };
  }
}
