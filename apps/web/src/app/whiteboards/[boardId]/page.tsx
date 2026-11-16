import { notFound } from "next/navigation";
import { BoardShell } from "@/components/whiteboards/board-shell";
import { logoutAction } from "@/modules/auth/actions";
import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { canMutateWhiteboards } from "@/modules/whiteboards/authorization";
import { boardIdSchema } from "@/modules/whiteboards/schemas";
import {
  getBoardEditorData,
  getBoardRecord,
} from "@/modules/whiteboards/server/data";
import { conciseTitle } from "@/lib/page-title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const context = await getWorkspaceContext();
  const parsed = boardIdSchema.safeParse((await params).boardId);
  if (!parsed.success) return { title: "Board" };
  const board = await getBoardRecord(context.organization.id, parsed.data);
  return { title: conciseTitle(board?.title) };
}

export default async function WhiteboardEditorPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const context = await getWorkspaceContext();
  const parsedId = boardIdSchema.safeParse((await params).boardId);
  if (!parsedId.success) notFound();
  const workspace = await getBoardEditorData(
    context.organization.id,
    parsedId.data,
  );
  if (!workspace) notFound();
  return (
    <BoardShell
      workspace={workspace}
      currentUserId={context.user.id}
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      organization={{
        id: context.organization.id,
        name: context.organization.name,
        role: context.membership.role,
      }}
      canMutate={canMutateWhiteboards(context.membership.role)}
    />
  );
}
