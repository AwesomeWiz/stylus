import { redirect } from "next/navigation";
import type { Route } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { logoutAction } from "@/modules/auth/actions";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { getOnboardingData } from "@/modules/onboarding/server/data";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { canMutateTasks } from "@/modules/tasks/authorization";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import { getMarketingOverview } from "@/modules/marketing/server/data";
import { getHomeCoreData } from "@/modules/home/server/data";

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

  const [notifications, home, enabledPluginIds] = await Promise.all([
    getNotificationSummary(context.organization.id, context.user.id),
    getHomeCoreData(context.organization.id),
    getEnabledOrganizationPluginIds(context.organization.id),
  ]);
  const marketing = enabledPluginIds.includes("marketing")
    ? await getMarketingOverview(context.organization.id)
    : null;

  return (
    <AppShell
      activePath="/"
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      notifications={notifications}
      organization={{
        id: context.organization.id,
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
      <HomeDashboard
        activity={home.activity}
        canMutate={canMutateTasks(context.membership.role)}
        currentUserId={context.user.id}
        marketing={marketing}
        members={home.members}
        nowIso={new Date().toISOString()}
        organizationName={context.organization.name}
        tasks={home.tasks}
      />
    </AppShell>
  );
}
