import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { BoardList } from "@/components/whiteboards/board-list";
import { canMutateWhiteboards } from "@/modules/whiteboards/authorization";
import { getBoards } from "@/modules/whiteboards/server/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function WhiteboardsPage() {
  const context = await getWorkspaceContext();

  const supabase = await createServerSupabaseClient();
  const [boards, members] = await Promise.all([
    getBoards(context.organization.id),
    supabase.rpc("list_organization_task_members", {
      p_organization_id: context.organization.id,
    }),
  ]);
  if (members.error) throw new Error("Board member names could not load.");
  return (
    <BoardList
      boards={boards}
      canMutate={canMutateWhiteboards(context.membership.role)}
      currentUserId={context.user.id}
      organizationId={context.organization.id}
      members={members.data ?? []}
    />
  );
}
