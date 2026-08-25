import { Clock3 } from "lucide-react";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { OnboardingReview } from "@/components/onboarding/review";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { OnboardingStepForm } from "@/components/onboarding/step-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { canManageOrganization } from "@/modules/organizations/authorization";
import { completeOnboardingAction } from "@/modules/onboarding/actions";
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
  searchParams: Promise<{ edit?: string }>;
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
  return (
    <OnboardingShell
      currentStep={step.number}
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
          <OnboardingReview data={data} />
          <form action={completeOnboardingAction} className="ml-auto max-w-52">
            <SubmitButton pendingLabel="Finishing…">
              Finish onboarding
            </SubmitButton>
          </form>
        </div>
      ) : (
        <OnboardingStepForm data={data} editing={editing} step={step.slug} />
      )}
    </OnboardingShell>
  );
}
