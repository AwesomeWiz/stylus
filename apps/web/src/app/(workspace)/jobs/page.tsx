import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { JobsWorkspace } from "@/components/jobs/jobs-workspace";
import { getOrganizationJobs } from "@/modules/jobs/server/data";
import { getOrganizationTeamData } from "@/modules/organizations/server/team-data";

export default async function JobsPage() {
  const context = await getWorkspaceContext();

  const [jobs, team] = await Promise.all([
    getOrganizationJobs(context.organization.id),
    getOrganizationTeamData(context.organization.id),
  ]);
  return (
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
  );
}
