"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState } from "react";

import { StepFields, type StepData } from "@/components/onboarding/step-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveOnboardingStepAction } from "@/modules/onboarding/actions";
import { initialOnboardingActionState } from "@/modules/onboarding/schemas";
import {
  getOnboardingPath,
  getOnboardingStep,
  type OnboardingStepSlug,
} from "@/modules/onboarding/steps";

export function OnboardingStepForm({
  data,
  editing,
  step,
}: {
  data: StepData;
  editing: boolean;
  step: OnboardingStepSlug;
}) {
  const [state, formAction] = useActionState(
    saveOnboardingStepAction,
    initialOnboardingActionState,
  );
  const current = getOnboardingStep(step)!;
  const backHref = editing
    ? "/company/profile"
    : current.number === 1
      ? "/"
      : getOnboardingPath(current.number - 1);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      <input name="step" type="hidden" value={step} />
      <input
        name="mode"
        type="hidden"
        value={editing ? "edit" : "onboarding"}
      />
      {state.message ? (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}
      {!state.message && state.fieldErrors ? (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          Review the fields below and correct the highlighted information.
        </div>
      ) : null}
      <StepFields data={data} errors={state.fieldErrors} step={step} />
      <div className="border-border flex items-center justify-between border-t pt-5">
        <Link
          className="text-muted-foreground hover:text-foreground inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium"
          href={backHref as Route}
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Back
        </Link>
        <SubmitButton pendingLabel="Saving…">
          {editing ? (
            <>
              <Check aria-hidden="true" className="size-4" /> Save changes
            </>
          ) : (
            <>
              Save and continue{" "}
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </SubmitButton>
      </div>
    </form>
  );
}
