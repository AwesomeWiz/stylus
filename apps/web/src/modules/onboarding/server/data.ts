import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrganizationMembership } from "@/modules/organizations/server/context";

export async function getOnboardingData(organizationId: string) {
  const context = await requireOrganizationMembership(organizationId);
  const supabase = await createServerSupabaseClient();
  const [company, audience, brand, marketing, competitors, progress] =
    await Promise.all([
      supabase
        .from("company_profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabase
        .from("audience_profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_primary", true)
        .maybeSingle(),
      supabase
        .from("brand_profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabase
        .from("marketing_profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabase
        .from("competitors")
        .select("*")
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .order("created_at"),
      supabase
        .from("onboarding_progress")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
    ]);

  const firstError = [
    company,
    audience,
    brand,
    marketing,
    competitors,
    progress,
  ].find((result) => result.error)?.error;
  if (firstError)
    throw new Error("Company onboarding data could not be loaded.");

  return {
    audience: audience.data,
    brand: brand.data,
    company: company.data,
    competitors: competitors.data ?? [],
    context,
    marketing: marketing.data,
    progress: progress.data,
  };
}

export async function getCurrentOnboardingData() {
  const { getCurrentOrganizationContext } =
    await import("@/modules/organizations/server/context");
  const context = await getCurrentOrganizationContext();
  return context ? getOnboardingData(context.organization.id) : null;
}
