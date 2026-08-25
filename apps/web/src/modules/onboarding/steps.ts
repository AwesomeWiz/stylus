export const onboardingSteps = [
  { label: "Company", slug: "company" },
  { label: "Problem & idea", slug: "problem" },
  { label: "Product", slug: "product" },
  { label: "Audience", slug: "audience" },
  { label: "Positioning & brand", slug: "positioning-brand" },
  { label: "Marketing", slug: "marketing" },
  { label: "Competitors", slug: "competitors" },
  { label: "Review & finish", slug: "review" },
] as const;

export type OnboardingStepSlug = (typeof onboardingSteps)[number]["slug"];

export function getOnboardingStep(slug: string) {
  const index = onboardingSteps.findIndex((step) => step.slug === slug);
  const step = onboardingSteps[index];
  return !step ? null : { ...step, index, number: index + 1 };
}

export function getOnboardingPath(stepNumber: number) {
  const safeIndex = Math.min(
    Math.max(stepNumber - 1, 0),
    onboardingSteps.length - 1,
  );
  const step = onboardingSteps[safeIndex] ?? onboardingSteps[0];
  return `/onboarding/${step.slug}`;
}

export function getNextOnboardingPath(slug: OnboardingStepSlug) {
  const step = getOnboardingStep(slug);
  return step && step.number < onboardingSteps.length
    ? getOnboardingPath(step.number + 1)
    : "/";
}
