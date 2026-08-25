import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { Brand } from "@/components/layout/brand";
import { cn } from "@/lib/utils";
import { onboardingSteps } from "@/modules/onboarding/steps";

export function OnboardingShell({
  children,
  currentStep,
  organizationName,
}: {
  children: ReactNode;
  currentStep: number;
  organizationName: string;
}) {
  const progress = Math.round((currentStep / onboardingSteps.length) * 100);
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <p className="text-muted-foreground max-w-48 truncate text-sm">
            {organizationName}
          </p>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-10">
        <aside
          aria-label="Onboarding progress"
          className="lg:sticky lg:top-8 lg:self-start"
        >
          <div className="mb-4 lg:hidden">
            <div className="mb-2 flex justify-between text-xs">
              <span>
                Step {currentStep} of {onboardingSteps.length}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <ol className="hidden space-y-1 lg:block">
            {onboardingSteps.map((step, index) => {
              const number = index + 1;
              return (
                <li
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    number === currentStep &&
                      "bg-accent text-accent-foreground font-medium",
                    number < currentStep && "text-foreground",
                    number > currentStep && "text-muted-foreground",
                  )}
                  key={step.slug}
                >
                  <span
                    className={cn(
                      "border-border flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                      number < currentStep &&
                        "bg-primary border-primary text-primary-foreground",
                    )}
                  >
                    {number < currentStep ? (
                      <Check aria-hidden="true" className="size-3.5" />
                    ) : (
                      number
                    )}
                  </span>
                  {step.label}
                </li>
              );
            })}
          </ol>
        </aside>
        <main className="min-w-0">
          <div className="mb-7">
            <p className="text-primary mb-1 text-xs font-semibold tracking-wide uppercase">
              Step {currentStep} of {onboardingSteps.length}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {onboardingSteps[currentStep - 1]?.label ?? "Company onboarding"}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              Build useful company context without needing every answer to be
              final. You can update this later.
            </p>
          </div>
          <div className="max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
