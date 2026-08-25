import { redirect } from "next/navigation";
import type { Route } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { HomePlaceholder } from "@/components/home/home-placeholder";
import { logoutAction } from "@/modules/auth/actions";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { getOnboardingData } from "@/modules/onboarding/server/data";

export default async function HomePage() {
  const context = await getCurrentOrganizationContext();

  if (!context) {
    redirect("/organization/new");
  }

  const onboarding = await getOnboardingData(context.organization.id);
  const onboardingDecision = getWorkspaceRouteDecision({
    completedAt: onboarding.progress?.completed_at ?? null,
    currentStep: onboarding.progress?.current_step ?? 1,
    role: context.membership.role,
  });

  if (onboardingDecision) {
    redirect(onboardingDecision as Route);
  }

  return (
    <AppShell
      activePath="/"
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      organization={{
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
      <HomePlaceholder />
    </AppShell>
  );
}
