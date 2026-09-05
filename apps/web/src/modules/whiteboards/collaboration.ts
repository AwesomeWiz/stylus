import type {
  BoardCommentRow,
  BoardElementRow,
  TaskMember,
} from "@/lib/supabase/database.types";

export type BoardPresence = {
  cursor: { x: number; y: number } | null;
  displayName: string;
  role: TaskMember["role"];
  userId: string;
};

const cursorColors = [
  "#0D98BA",
  "#7C3AED",
  "#C2410C",
  "#047857",
  "#BE185D",
  "#1D4ED8",
] as const;
const MAX_CURSOR_COORDINATE = 1_000_000;

function isCursorCoordinate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= MAX_CURSOR_COORDINATE
  );
}

export function boardPresenceColor(userId: string) {
  let hash = 0;
  for (const character of userId)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return cursorColors[Math.abs(hash) % cursorColors.length]!;
}

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
      const rawCursor = (entry as Record<string, unknown>).cursor;
      const cursor =
        rawCursor &&
        typeof rawCursor === "object" &&
        isCursorCoordinate((rawCursor as Record<string, unknown>).x) &&
        isCursorCoordinate((rawCursor as Record<string, unknown>).y)
          ? {
              x: Number((rawCursor as Record<string, unknown>).x),
              y: Number((rawCursor as Record<string, unknown>).y),
            }
          : null;
      present.set(userId, {
        cursor,
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
