"use client";
import { useActionState } from "react";
import type { Route } from "next";
import { completeOnboardingAction } from "@/modules/onboarding/actions";
import { initialOnboardingActionState } from "@/modules/onboarding/schemas";
import { Button } from "@/components/ui/button";
import { OnboardingLink } from "./navigation";
export function FinishOnboardingForm({ hasDrafts }: { hasDrafts: boolean }) {
  const [state, action, pending] = useActionState(
    completeOnboardingAction,
    initialOnboardingActionState,
  );
  return (
    <form action={action} className="space-y-3 border-t pt-5">
      {state.message ? (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <OnboardingLink
          className="inline-flex min-h-11 items-center py-2 text-sm underline"
          href={"/onboarding/competitors?edit=1&return=review" as Route}
        >
          Back
        </OnboardingLink>
        <Button
          type="submit"
          className="min-h-11"
          disabled={pending || hasDrafts}
        >
          {pending ? "Finishing…" : "Finish setup"}
        </Button>
      </div>
      {hasDrafts ? (
        <p className="text-muted-foreground text-sm">
          Confirm or discard the saved drafts above before finishing.
        </p>
      ) : null}
    </form>
  );
}
