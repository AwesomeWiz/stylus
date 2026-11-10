import { Clock3 } from "lucide-react";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { OnboardingReview } from "@/components/onboarding/review";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { OnboardingStepForm } from "@/components/onboarding/step-form";
import { FinishOnboardingForm } from "@/components/onboarding/finish-form";
import { OnboardingLink } from "@/components/onboarding/navigation";
import { canManageOrganization } from "@/modules/organizations/authorization";
import {
  getOnboardingDraft,
  getOutstandingOnboardingDrafts,
} from "@/modules/onboarding/server/drafts";
import { getCurrentOnboardingData } from "@/modules/onboarding/server/data";
import {
  getOnboardingPath,
  getOnboardingStep,
} from "@/modules/onboarding/steps";

export default async function OnboardingStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ edit?: string; return?: string }>;
}) {
  const [{ step: slug }, query, data] = await Promise.all([
    params,
    searchParams,
    getCurrentOnboardingData(),
  ]);
  const step = getOnboardingStep(slug);
  if (!step) return notFound();
  if (!data) redirect("/organization/new");

  const editing = query.edit === "1";
  const completed = Boolean(data.progress?.completed_at);
  if (completed && !editing) redirect("/");

  const savedStep = data.progress?.current_step ?? 1;
  if (!completed && step.number > savedStep)
    redirect(getOnboardingPath(savedStep) as Route);

  const canManage = canManageOrganization(data.context.membership.role);
  const draft =
    canManage && step.slug !== "review"
      ? await getOnboardingDraft(step.slug)
      : null;
  const outstanding =
    canManage && step.slug === "review"
      ? await getOutstandingOnboardingDrafts()
      : [];
  return (
    <OnboardingShell
      currentStep={step.number}
      savedStep={completed ? 8 : savedStep}
      editing={editing}
      canNavigate={canManage}
      organizationName={data.context.organization.name}
    >
      {!canManage ? (
        <div className="border-border bg-muted/40 rounded-md border px-5 py-6">
          <Clock3 aria-hidden="true" className="text-primary mb-3 size-5" />
          <h2 className="font-semibold">Waiting for company setup</h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
            An organization owner or administrator needs to finish this profile.
            You can enter the workspace once setup is complete.
          </p>
        </div>
      ) : step.slug === "review" ? (
        <div className="space-y-7">
          {outstanding.length ? (
            <section
              aria-label="Unconfirmed saved drafts"
              className="space-y-2 rounded-md border p-4"
            >
              <h2 className="text-sm font-semibold">Saved drafts to confirm</h2>
              <p className="text-muted-foreground text-sm">
                These edits are saved separately and are not in the profile
                below yet.
              </p>
              <ul>
                {outstanding.map((row) => (
                  <li key={row.step}>
                    <OnboardingLink
                      className="inline-block min-h-11 py-2 text-sm underline"
                      href={
                        `/onboarding/${row.step}?edit=1&return=review` as Route
                      }
                    >
                      Review {getOnboardingStep(row.step)?.label} draft
                    </OnboardingLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <OnboardingReview data={data} returnToReview />
          <FinishOnboardingForm hasDrafts={!!outstanding.length} />
        </div>
      ) : (
        <OnboardingStepForm
          key={`${data.context.organization.id}:${data.context.user.id}:${step.slug}:${draft!.updated_at ?? "initial"}:${draft!.base_revision ?? "empty"}`}
          data={data}
          editing={editing}
          step={step.slug}
          organizationId={data.context.organization.id}
          draft={draft!}
          returnToReview={query.return === "review"}
        />
      )}
    </OnboardingShell>
  );
}

export const metadata = { title: "Company setup" };
