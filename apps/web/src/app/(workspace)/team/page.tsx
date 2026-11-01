import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { TeamManagement } from "@/components/organizations/team-management";
import { PageHeader } from "@/components/ui/page-header";
import {
  getOrganizationMemberLastSignIns,
  getOrganizationTeamData,
} from "@/modules/organizations/server/team-data";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ accepted?: string }>;
}) {
  const context = await getWorkspaceContext();

  const team = await getOrganizationTeamData(context.organization.id);
  const members = ["OWNER", "ADMIN"].includes(context.membership.role)
    ? await getOrganizationMemberLastSignIns(
        context.membership.role,
        team.members,
      )
    : team.members.map((member) => ({ ...member, lastSignInAt: null }));
  const query = await searchParams;
  return (
    <>
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
    </>
  );
}
