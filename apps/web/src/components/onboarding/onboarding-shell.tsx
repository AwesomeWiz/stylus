import { Check } from "lucide-react";
import type { ReactNode } from "react";
import type { Route } from "next";
import { Brand } from "@/components/layout/brand";
import { onboardingSteps, getOnboardingPath } from "@/modules/onboarding/steps";
import { OnboardingNavigation, OnboardingLink } from "./navigation";
export function OnboardingShell({
  children,
  currentStep,
  organizationName,
  savedStep = currentStep,
  editing = false,
  canNavigate = true,
}: {
  children: ReactNode;
  currentStep: number;
  organizationName: string;
  savedStep?: number;
  editing?: boolean;
  canNavigate?: boolean;
}) {
  const progress = Math.round(((Math.min(savedStep, 8) - 1) / 7) * 100);
  const steps = (
    <ol className="space-y-1">
      {onboardingSteps.map((step, index) => {
        const number = index + 1,
          done = number < savedStep,
          content = (
            <>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs">
                {done ? (
                  <Check aria-hidden="true" className="size-3.5" />
                ) : (
                  number
                )}
              </span>
              <span className="min-w-0 break-words">
                {step.label}
                {done ? <span className="sr-only"> · Completed</span> : null}
              </span>
            </>
          );
        return (
          <li key={step.slug}>
            {canNavigate && number <= savedStep ? (
              <OnboardingLink
                aria-current={number === currentStep ? "step" : undefined}
                className={
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm " +
                  (number === currentStep
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-muted")
                }
                href={
                  (getOnboardingPath(number) +
                    (editing ? "?edit=1" : "")) as Route
                }
              >
                {content}
              </OnboardingLink>
            ) : (
              <span
                aria-current={number === currentStep ? "step" : undefined}
                className="text-muted-foreground flex min-h-11 items-center gap-3 px-3 py-2 text-sm"
              >
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
  return (
    <OnboardingNavigation>
      <div className="bg-background min-h-screen [overflow-wrap:anywhere]">
        <a
          href="#onboarding-main"
          className="bg-background sr-only fixed top-2 left-2 z-50 rounded border p-3 focus:not-sr-only"
        >
          Skip to setup form
        </a>
        <header className="border-b">
          <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Brand />
            <p className="text-muted-foreground max-w-40 truncate text-sm">
              {organizationName}
            </p>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 lg:py-10">
          <aside
            aria-label="Onboarding progress"
            className="lg:sticky lg:top-8 lg:self-start"
          >
            <div className="lg:hidden">
              <p className="mb-2 text-sm font-medium">
                Step {currentStep} of 8 ·{" "}
                {onboardingSteps[currentStep - 1]?.label}
              </p>
              <div
                role="progressbar"
                aria-label="Saved setup steps"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${Math.min(savedStep - 1, 7)} of 7 information steps confirmed`}
                className="bg-muted h-1.5 overflow-hidden rounded-full"
              >
                <div
                  className="bg-primary h-full"
                  style={{ width: progress + "%" }}
                />
              </div>
              <details className="mt-3">
                <summary className="min-h-11 cursor-pointer py-2 text-sm underline">
                  Choose a setup step
                </summary>
                {steps}
              </details>
            </div>
            <nav aria-label="Company setup steps" className="hidden lg:block">
              {steps}
            </nav>
          </aside>
          <main id="onboarding-main" className="max-w-[760px] min-w-0">
            <div className="mb-6">
              <p className="text-muted-foreground mb-1 text-xs">
                Step {currentStep} of 8
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {onboardingSteps[currentStep - 1]?.label ?? "Company setup"}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Start with what you know. Optional details can wait; your team
                can update the profile later.
              </p>
            </div>
            {children}
          </main>
        </div>
      </div>
    </OnboardingNavigation>
  );
}
