import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { BoardList } from "@/components/whiteboards/board-list";
import { canMutateWhiteboards } from "@/modules/whiteboards/authorization";
import { getBoards } from "@/modules/whiteboards/server/data";

export default async function WhiteboardsPage() {
  const context = await getWorkspaceContext();

  const boards = await getBoards(context.organization.id);
  return (
    <BoardList
      boards={boards}
      canMutate={canMutateWhiteboards(context.membership.role)}
      currentUserId={context.user.id}
    />
  );
}
