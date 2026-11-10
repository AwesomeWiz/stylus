import { MilestonesWorkspace } from "./milestones-workspace";
import { getMilestone, getMilestones } from "@/modules/execution/server/data";
import { executionContext, checked } from "@/modules/execution/server/context";
export async function MilestonesPage({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  const { db, org, context } = await executionContext(),
    archived = params.archived === "true";
  const [page, selected, members] = await Promise.all([
    getMilestones(archived, params.after, params.query),
    params.milestone ? getMilestone(params.milestone) : null,
    db.rpc("list_organization_task_members", { p_organization_id: org }),
  ]);
  return (
    <MilestonesWorkspace
      key={`${org}:${context.user.id}:${context.membership.role}`}
      page={page}
      selected={selected}
      selectedId={params.milestone}
      canEdit={context.membership.role !== "VIEWER"}
      members={checked(members)}
      archived={archived}
      query={params.query ?? ""}
    />
  );
}
