import type { BoardElementRow } from "@/lib/supabase/database.types";

export const WHITEBOARD_HISTORY_LIMIT = 75;
export type WhiteboardSnapshot = BoardElementRow[];
export type WhiteboardElementChange = {
  after: BoardElementRow | null;
  before: BoardElementRow | null;
  elementId: string;
};
export type WhiteboardOperation = { changes: WhiteboardElementChange[] };
export type WhiteboardHistory = {
  future: WhiteboardOperation[];
  past: WhiteboardOperation[];
  present: WhiteboardSnapshot;
};

export function createWhiteboardHistory(
  elements: WhiteboardSnapshot,
): WhiteboardHistory {
  return { future: [], past: [], present: elements };
}

export function recordWhiteboardHistory(
  history: WhiteboardHistory,
  present: WhiteboardSnapshot,
  limit = WHITEBOARD_HISTORY_LIMIT,
): WhiteboardHistory {
  const operation = operationBetween(history.present, present);
  if (!operation.changes.length) return history;
  return {
    future: [],
    past: [...history.past, operation].slice(-limit),
    present,
  };
}

export function undoWhiteboardHistory(history: WhiteboardHistory) {
  const operation = history.past.at(-1);
  if (!operation) return history;
  return {
    future: [operation, ...history.future],
    past: history.past.slice(0, -1),
    present: applyOperation(history.present, operation, "before"),
  };
}

export function redoWhiteboardHistory(history: WhiteboardHistory) {
  const operation = history.future[0];
  if (!operation) return history;
  return {
    future: history.future.slice(1),
    past: [...history.past, operation].slice(-WHITEBOARD_HISTORY_LIMIT),
    present: applyOperation(history.present, operation, "after"),
  };
}

export function reconcileRemoteElement(
  history: WhiteboardHistory,
  element: BoardElementRow,
  { preserveHistory = false }: { preserveHistory?: boolean } = {},
): WhiteboardHistory {
  const present = upsertActiveElement(history.present, element);
  if (preserveHistory) return { ...history, present };
  const touchesElement = (operation: WhiteboardOperation) =>
    operation.changes.some((change) => change.elementId === element.id);
  return {
    future: history.future.filter((operation) => !touchesElement(operation)),
    past: history.past.filter((operation) => !touchesElement(operation)),
    present,
  };
}

export function diffWhiteboardSnapshots(
  from: WhiteboardSnapshot,
  to: WhiteboardSnapshot,
) {
  const operation = operationBetween(from, to);
  return {
    archiveIds: operation.changes
      .filter((change) => change.before && !change.after)
      .map((change) => change.elementId),
    restore: operation.changes.flatMap((change) =>
      !change.before && change.after ? [change.after] : [],
    ),
    update: operation.changes.flatMap((change) =>
      change.before && change.after ? [change.after] : [],
    ),
  };
}

function operationBetween(
  before: WhiteboardSnapshot,
  after: WhiteboardSnapshot,
): WhiteboardOperation {
  const beforeById = new Map(before.map((element) => [element.id, element]));
  const afterById = new Map(after.map((element) => [element.id, element]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  return {
    changes: [...ids].flatMap((elementId) => {
      const previous = beforeById.get(elementId) ?? null;
      const next = afterById.get(elementId) ?? null;
      return sameElement(previous, next)
        ? []
        : [{ after: next, before: previous, elementId }];
    }),
  };
}

function applyOperation(
  snapshot: WhiteboardSnapshot,
  operation: WhiteboardOperation,
  version: "before" | "after",
) {
  let result = snapshot;
  for (const change of operation.changes) {
    const element = change[version];
    result = element
      ? upsertActiveElement(result, element)
      : result.filter((candidate) => candidate.id !== change.elementId);
  }
  return result;
}

function upsertActiveElement(
  snapshot: WhiteboardSnapshot,
  element: BoardElementRow,
) {
  if (element.archived_at)
    return snapshot.filter((candidate) => candidate.id !== element.id);
  if (!snapshot.some((candidate) => candidate.id === element.id))
    return [...snapshot, element];
  return snapshot.map((candidate) =>
    candidate.id === element.id ? element : candidate,
  );
}

function sameElement(
  left: BoardElementRow | null,
  right: BoardElementRow | null,
) {
  if (!left || !right) return left === right;
  return (
    left.id === right.id &&
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height &&
    left.rotation === right.rotation &&
    left.z_index === right.z_index &&
    left.archived_at === right.archived_at &&
    JSON.stringify(left.content) === JSON.stringify(right.content) &&
    JSON.stringify(left.style) === JSON.stringify(right.style) &&
    JSON.stringify(left.metadata) === JSON.stringify(right.metadata)
  );
}
