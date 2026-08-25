import type {
  BoardCommentRow,
  BoardElementRow,
  TaskMember,
} from "@/lib/supabase/database.types";

export type BoardPresence = {
  displayName: string;
  role: TaskMember["role"];
  userId: string;
};

export function reconcileBoardComment(
  comments: BoardCommentRow[],
  comment: BoardCommentRow,
) {
  if (!comments.some((candidate) => candidate.id === comment.id))
    return [...comments, comment].sort(compareComments);
  return comments.map((candidate) =>
    candidate.id === comment.id ? comment : candidate,
  );
}

export function chooseCommittedElement(
  local: BoardElementRow | null,
  remote: BoardElementRow,
) {
  if (!local) return remote;
  return Date.parse(remote.updated_at) > Date.parse(local.updated_at)
    ? remote
    : local;
}

export function normalizeBoardPresence(
  state: Record<string, unknown[]>,
  members: TaskMember[],
) {
  const memberById = new Map(
    members.map((member) => [member.member_user_id, member]),
  );
  const present = new Map<string, BoardPresence>();
  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const userId = (entry as Record<string, unknown>).userId;
      if (typeof userId !== "string") continue;
      const member = memberById.get(userId);
      if (!member) continue;
      present.set(userId, {
        displayName: member.display_name,
        role: member.role,
        userId,
      });
    }
  }
  return [...present.values()];
}

function compareComments(left: BoardCommentRow, right: BoardCommentRow) {
  return (
    Date.parse(left.created_at) - Date.parse(right.created_at) ||
    left.id.localeCompare(right.id)
  );
}
