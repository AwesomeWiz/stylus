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

export const boardCollaboratorPalette = [
  {
    background: "var(--collaborator-blue)",
    cursor: "var(--collaborator-blue)",
    family: "blue",
    foreground: "var(--collaborator-on-blue)",
    hue: 205,
    subtle: "var(--collaborator-blue-subtle)",
  },
  {
    background: "var(--collaborator-coral)",
    cursor: "var(--collaborator-coral)",
    family: "coral",
    foreground: "var(--collaborator-on-coral)",
    hue: 18,
    subtle: "var(--collaborator-coral-subtle)",
  },
  {
    background: "var(--collaborator-violet)",
    cursor: "var(--collaborator-violet)",
    family: "violet",
    foreground: "var(--collaborator-on-violet)",
    hue: 276,
    subtle: "var(--collaborator-violet-subtle)",
  },
  {
    background: "var(--collaborator-amber)",
    cursor: "var(--collaborator-amber)",
    family: "amber",
    foreground: "var(--collaborator-on-amber)",
    hue: 42,
    subtle: "var(--collaborator-amber-subtle)",
  },
  {
    background: "var(--collaborator-magenta)",
    cursor: "var(--collaborator-magenta)",
    family: "magenta",
    foreground: "var(--collaborator-on-magenta)",
    hue: 326,
    subtle: "var(--collaborator-magenta-subtle)",
  },
  {
    background: "var(--collaborator-green)",
    cursor: "var(--collaborator-green)",
    family: "green",
    foreground: "var(--collaborator-on-green)",
    hue: 154,
    subtle: "var(--collaborator-green-subtle)",
  },
  {
    background: "var(--collaborator-indigo)",
    cursor: "var(--collaborator-indigo)",
    family: "indigo",
    foreground: "var(--collaborator-on-indigo)",
    hue: 235,
    subtle: "var(--collaborator-indigo-subtle)",
  },
  {
    background: "var(--collaborator-red)",
    cursor: "var(--collaborator-red)",
    family: "red",
    foreground: "var(--collaborator-on-red)",
    hue: 4,
    subtle: "var(--collaborator-red-subtle)",
  },
] as const;
export type BoardCollaboratorColorFamily =
  (typeof boardCollaboratorPalette)[number]["family"];
export type BoardCollaboratorColorAssignments = Record<
  string,
  BoardCollaboratorColorFamily
>;
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

function collaboratorHash(userId: string) {
  let hash = 0;
  for (const character of userId)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function hueDistance(left: number, right: number) {
  const difference = Math.abs(left - right);
  return Math.min(difference, 360 - difference);
}

export function allocateBoardCollaboratorColors(
  userIds: Iterable<string>,
  previous: BoardCollaboratorColorAssignments = {},
) {
  const active = [...new Set(userIds)].sort();
  const activeSet = new Set(active);
  const paletteByFamily = new Map(
    boardCollaboratorPalette.map((entry) => [entry.family, entry]),
  );
  const assignments: BoardCollaboratorColorAssignments = {};
  const used = new Set<BoardCollaboratorColorFamily>();

  for (const [userId, family] of Object.entries(previous)) {
    if (
      !activeSet.has(userId) ||
      used.has(family) ||
      !paletteByFamily.has(family)
    )
      continue;
    assignments[userId] = family;
    used.add(family);
  }

  for (const userId of active) {
    if (assignments[userId]) continue;
    const preferredIndex =
      collaboratorHash(userId) % boardCollaboratorPalette.length;
    const available = boardCollaboratorPalette.filter(
      (entry) => !used.has(entry.family),
    );
    const candidates = available.length ? available : boardCollaboratorPalette;
    const selected = [...candidates].sort((left, right) => {
      const leftSeparation = used.size
        ? Math.min(
            ...[...used].map((family) =>
              hueDistance(left.hue, paletteByFamily.get(family)!.hue),
            ),
          )
        : 360;
      const rightSeparation = used.size
        ? Math.min(
            ...[...used].map((family) =>
              hueDistance(right.hue, paletteByFamily.get(family)!.hue),
            ),
          )
        : 360;
      if (rightSeparation !== leftSeparation)
        return rightSeparation - leftSeparation;
      const leftPreference =
        (boardCollaboratorPalette.indexOf(left) -
          preferredIndex +
          boardCollaboratorPalette.length) %
        boardCollaboratorPalette.length;
      const rightPreference =
        (boardCollaboratorPalette.indexOf(right) -
          preferredIndex +
          boardCollaboratorPalette.length) %
        boardCollaboratorPalette.length;
      return leftPreference - rightPreference;
    })[0]!;
    assignments[userId] = selected.family;
    used.add(selected.family);
  }
  return assignments;
}

export function boardCollaboratorColor(
  userId: string,
  assignments: BoardCollaboratorColorAssignments,
) {
  const family =
    assignments[userId] ??
    boardCollaboratorPalette[
      collaboratorHash(userId) % boardCollaboratorPalette.length
    ]!.family;
  return boardCollaboratorPalette.find((entry) => entry.family === family)!;
}

export function boardPresenceColor(userId: string) {
  return boardCollaboratorColor(userId, {}).background;
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
