"use server";
import type { Route } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { assertCanManageOnboarding } from "./authorization";
import type { OnboardingActionState } from "./schemas";
import { parseOnboardingFields } from "./form-values";
import {
  getNextOnboardingPath,
  getOnboardingStep,
  type OnboardingStepSlug,
} from "./steps";
import { draftRequest, draftSaveRequest, draftResolveRequest } from "./drafts";

async function manager(expectedOrg?: string) {
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  assertCanManageOnboarding(current.membership.role);
  if (expectedOrg && current.organization.id !== expectedOrg)
    throw { code: "42501" };
  return { current, db: await createServerSupabaseClient() };
}
function errorState(error: unknown): OnboardingActionState {
  if (error instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "form");
      (fieldErrors[field] ??= []).push(issue.message);
    }
    return { status: "error", fieldErrors };
  }
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "UNKNOWN";
  return {
    status: "error",
    message:
      code === "PT409"
        ? "This draft or company profile changed. Reload to review the current version before continuing."
        : code === "42501"
          ? "Company setup is unavailable for your current membership or role."
          : code === "22023"
            ? "Check the required fields and resolve saved drafts before finishing."
            : "The save response could not be confirmed. Your fields are retained; reload to check the saved draft before retrying.",
  };
}
export async function readOnboardingDraftAction(input: unknown) {
  try {
    const v = draftRequest.parse(input),
      { current, db } = await manager(v.organizationId),
      result = await db.rpc("read_onboarding_draft", {
        p_organization_id: current.organization.id,
        p_step: v.step,
      });
    if (result.error) throw result.error;
    return { status: "success", data: result.data[0] } as const;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }
}
export async function saveOnboardingDraftAction(input: unknown) {
  try {
    const v = draftSaveRequest.parse(input),
      { current, db } = await manager(v.organizationId),
      result = await db.rpc("save_onboarding_draft", {
        p_organization_id: current.organization.id,
        p_step: v.step,
        p_fields: v.fields,
        p_base_revision: v.baseRevision,
        p_expected_updated_at: v.revision,
      });
    if (result.error) throw result.error;
    return { status: "success", revision: result.data } as const;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }
}
export async function resolveOnboardingDraftAction(input: unknown) {
  try {
    const v = draftResolveRequest.parse(input),
      { current, db } = await manager(v.organizationId),
      result = await db.rpc("resolve_onboarding_draft", {
        p_organization_id: current.organization.id,
        p_step: v.step,
        p_expected_updated_at: v.revision,
        p_keep: v.keep,
      });
    if (result.error) throw result.error;
    return { status: "success" } as const;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }
}
export async function saveOnboardingStepAction(
  _previous: OnboardingActionState,
  form: FormData,
): Promise<OnboardingActionState> {
  const step = String(form.get("step") ?? "") as OnboardingStepSlug;
  if (!getOnboardingStep(step) || step === "review")
    return { status: "error", message: "Invalid onboarding step." };
  const { current, db } = await manager(
    String(form.get("organizationId") ?? ""),
  );
  try {
    const fields = parseOnboardingFields(step, form),
      revision = z.iso.datetime({ offset: true }).nullable(),
      base = revision.parse(form.get("baseRevision") || null),
      draft = revision.parse(form.get("draftRevision") || null);
    const result = await db.rpc("commit_onboarding_step", {
      p_organization_id: current.organization.id,
      p_step: step,
      p_fields: fields,
      p_base_revision: base,
      p_draft_revision: draft,
    });
    if (result.error) throw result.error;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }
  redirect(
    (form.get("returnTo") === "review"
      ? "/onboarding/review?edit=1"
      : form.get("mode") === "edit"
        ? "/company/profile"
        : getNextOnboardingPath(step)) as Route,
  );
}
export async function completeOnboardingAction(
  _previous?: OnboardingActionState,
): Promise<OnboardingActionState> {
  void _previous;
  const { current, db } = await manager();
  try {
    const result = await db.rpc("finish_company_onboarding", {
      p_organization_id: current.organization.id,
    });
    if (result.error) throw result.error;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }
  redirect("/");
}
