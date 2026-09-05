import type { Route } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { TeamManagement } from "@/components/organizations/team-management";
import { PageHeader } from "@/components/ui/page-header";
import { logoutAction } from "@/modules/auth/actions";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import {
  getOrganizationMemberLastSignIns,
  getOrganizationTeamData,
} from "@/modules/organizations/server/team-data";
import { getOnboardingData } from "@/modules/onboarding/server/data";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ accepted?: string }>;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const onboarding = await getOnboardingData(context.organization.id);
  const decision = getWorkspaceRouteDecision({
    completedAt: onboarding.progress?.completed_at ?? null,
    currentStep: onboarding.progress?.current_step ?? 1,
    role: context.membership.role,
  });
  if (decision) redirect(decision as Route);
  const [team, notifications] = await Promise.all([
    getOrganizationTeamData(context.organization.id),
    getNotificationSummary(context.organization.id, context.user.id),
  ]);
  const members = ["OWNER", "ADMIN"].includes(context.membership.role)
    ? await getOrganizationMemberLastSignIns(
        context.membership.role,
        team.members,
      )
    : team.members.map((member) => ({ ...member, lastSignInAt: null }));
  const query = await searchParams;
  return (
    <AppShell
      activePath="/team"
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
        description="Manage access to your shared Stylus organization."
        title="Team"
      />
      {query.accepted === "1" ? (
        <p className="border-success/30 bg-success/10 mb-6 rounded-md border px-4 py-3 text-sm">
          Invitation accepted. You are now a member of{" "}
          {context.organization.name}.
        </p>
      ) : null}
      <TeamManagement
        currentRole={context.membership.role}
        currentUserId={context.user.id}
        invitations={team.invitations}
        members={members}
      />
    </AppShell>
  );
}
