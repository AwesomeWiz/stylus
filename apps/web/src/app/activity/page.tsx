import type { Route } from "next";
import { redirect } from "next/navigation";

import { ActivityList } from "@/components/activity/activity-list";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { getActivityHistory } from "@/modules/activity/server/data";
import { logoutAction } from "@/modules/auth/actions";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { getOnboardingData } from "@/modules/onboarding/server/data";

export default async function ActivityPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");

  const onboarding = await getOnboardingData(context.organization.id);
  const onboardingDecision = getWorkspaceRouteDecision({
    completedAt: onboarding.progress?.completed_at ?? null,
    currentStep: onboarding.progress?.current_step ?? 1,
    role: context.membership.role,
  });
  if (onboardingDecision) redirect(onboardingDecision as Route);

  const [activity, notifications] = await Promise.all([
    getActivityHistory(context.organization.id),
    getNotificationSummary(context.organization.id, context.user.id),
  ]);

  return (
    <AppShell
      activePath="/activity"
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
      <PageHeader
        description="A concise history of meaningful task collaboration across your organization."
        title="Activity"
      />
      <ActivityList events={activity.events} members={activity.members} />
    </AppShell>
  );
}
