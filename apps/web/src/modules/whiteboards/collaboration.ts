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

export type BoardCursorUpdate = {
  cursor: { x: number; y: number } | null;
  userId: string;
};

const collaboratorColors = [
  "var(--collaborator-cyan)",
  "var(--collaborator-violet)",
  "var(--collaborator-coral)",
  "var(--collaborator-green)",
  "var(--collaborator-pink)",
  "var(--collaborator-indigo)",
] as const;
const MAX_CURSOR_COORDINATE = 1_000_000;

export function boardCollaborationTopic(
  organizationId: string,
  boardId: string,
) {
  return `board:${organizationId}:${boardId}`;
}

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
  return collaboratorColors[Math.abs(hash) % collaboratorColors.length]!;
}

export function boardPresenceInitials(displayName: string) {
  return (
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function flowPointToViewport(
  point: { x: number; y: number },
  viewport: { x: number; y: number; zoom: number },
) {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  };
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
      present.set(userId, {
        displayName: member.display_name,
        role: member.role,
        userId,
      });
    }
  }
  return [...present.values()];
}

export function includeLocalBoardPresence(
  presence: BoardPresence[],
  currentUser: { displayName: string; id: string },
  members: TaskMember[],
) {
  const localMember = members.find(
    (member) => member.member_user_id === currentUser.id,
  );
  if (!localMember) return presence;
  const unique = new Map(presence.map((person) => [person.userId, person]));
  unique.set(currentUser.id, {
    displayName: localMember.display_name || currentUser.displayName,
    role: localMember.role,
    userId: currentUser.id,
  });
  return [...unique.values()].sort((left, right) => {
    if (left.userId === currentUser.id) return -1;
    if (right.userId === currentUser.id) return 1;
    return (
      left.displayName.localeCompare(right.displayName) ||
      left.userId.localeCompare(right.userId)
    );
  });
}

export function normalizeBoardCursorBroadcast(
  payload: unknown,
  state: Record<string, unknown[]>,
  members: TaskMember[],
  currentUserId: string,
): BoardCursorUpdate | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Record<string, unknown>;
  if (
    typeof candidate.sessionId !== "string" ||
    !isCursorCoordinate(candidate.x) ||
    !isCursorCoordinate(candidate.y)
  )
    return null;
  const memberIds = new Set(members.map((member) => member.member_user_id));
  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const session = entry as Record<string, unknown>;
      if (session.sessionId !== candidate.sessionId) continue;
      if (
        typeof session.userId !== "string" ||
        session.userId === currentUserId ||
        !memberIds.has(session.userId)
      )
        return null;
      return {
        cursor: { x: candidate.x, y: candidate.y },
        userId: session.userId,
      };
    }
  }
  return null;
}

function compareComments(left: BoardCommentRow, right: BoardCommentRow) {
  return (
    Date.parse(left.created_at) - Date.parse(right.created_at) ||
    left.id.localeCompare(right.id)
  );
}
