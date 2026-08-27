import type { Route } from "next";
import { redirect } from "next/navigation";

import { JobsWorkspace } from "@/components/jobs/jobs-workspace";
import { AppShell } from "@/components/layout/app-shell";
import { logoutAction } from "@/modules/auth/actions";
import { getOrganizationJobs } from "@/modules/jobs/server/data";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getOnboardingData } from "@/modules/onboarding/server/data";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getOrganizationTeamData } from "@/modules/organizations/server/team-data";

export default async function JobsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const onboarding = await getOnboardingData(context.organization.id);
  const decision = getWorkspaceRouteDecision({
    completedAt: onboarding.progress?.completed_at ?? null,
    currentStep: onboarding.progress?.current_step ?? 1,
    role: context.membership.role,
  });
  if (decision) redirect(decision as Route);
  const [jobs, notifications, team] = await Promise.all([
    getOrganizationJobs(context.organization.id),
    getNotificationSummary(context.organization.id, context.user.id),
    getOrganizationTeamData(context.organization.id),
  ]);
  return (
    <AppShell
      activePath="/jobs"
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
      <JobsWorkspace
        currentRole={context.membership.role}
        currentUserId={context.user.id}
        jobs={jobs}
        memberNames={Object.fromEntries(
          team.members.map((member) => [
            member.member_user_id,
            member.display_name,
          ]),
        )}
      />
    </AppShell>
  );
}
