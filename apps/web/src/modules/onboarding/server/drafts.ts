import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { assertCanManageOnboarding } from "../authorization";
import { draftStep } from "../drafts";
export async function getOnboardingDraft(step: string) {
  const current = await getCurrentOrganizationContext();
  if (!current) throw Error("Company setup unavailable.");
  assertCanManageOnboarding(current.membership.role);
  const db = await createServerSupabaseClient(),
    result = await db.rpc("read_onboarding_draft", {
      p_organization_id: current.organization.id,
      p_step: draftStep.parse(step),
    });
  if (result.error || !result.data?.[0])
    throw Error("Your saved draft could not load. Reload to resume.");
  return result.data[0];
}
export async function getOutstandingOnboardingDrafts() {
  const current = await getCurrentOrganizationContext();
  if (!current) throw Error("Company setup unavailable.");
  assertCanManageOnboarding(current.membership.role);
  const db = await createServerSupabaseClient(),
    result = await db
      .from("onboarding_drafts")
      .select("step,updated_at")
      .eq("organization_id", current.organization.id)
      .order("step")
      .limit(7);
  if (result.error) throw Error("Saved drafts could not load.");
  return result.data;
}
