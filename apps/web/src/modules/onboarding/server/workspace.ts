import "server-only";

import { cache } from "react";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getWorkspaceRouteDecision } from "../routing";

export const getWorkspaceContext = cache(async () => {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("completed_at, current_step")
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (error) throw new Error("Company setup status could not be loaded.");
  const decision = getWorkspaceRouteDecision({
    completedAt: data?.completed_at ?? null,
    currentStep: data?.current_step ?? 1,
    role: context.membership.role,
  });
  if (decision) redirect(decision as Route);
  return context;
});
