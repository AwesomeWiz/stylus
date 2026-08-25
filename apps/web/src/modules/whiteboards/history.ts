import type { BoardElementRow } from "@/lib/supabase/database.types";

export const WHITEBOARD_HISTORY_LIMIT = 75;

export type WhiteboardSnapshot = BoardElementRow[];

export type WhiteboardHistory = {
  future: WhiteboardSnapshot[];
  past: WhiteboardSnapshot[];
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
  if (sameSnapshot(history.present, present)) return history;
  return {
    future: [],
    past: [...history.past, history.present].slice(-limit),
    present,
  };
}

export function undoWhiteboardHistory(history: WhiteboardHistory) {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    future: [history.present, ...history.future],
    past: history.past.slice(0, -1),
    present: previous,
  };
}

export function redoWhiteboardHistory(history: WhiteboardHistory) {
  const next = history.future[0];
  if (!next) return history;
  return {
    future: history.future.slice(1),
    past: [...history.past, history.present].slice(-WHITEBOARD_HISTORY_LIMIT),
    present: next,
  };
}

export function diffWhiteboardSnapshots(
  from: WhiteboardSnapshot,
  to: WhiteboardSnapshot,
) {
  const fromById = new Map(from.map((element) => [element.id, element]));
  const toById = new Map(to.map((element) => [element.id, element]));
  return {
    archiveIds: from
      .filter((element) => !toById.has(element.id))
      .map((element) => element.id),
    restore: to.filter((element) => !fromById.has(element.id)),
    update: to.filter((element) => {
      const current = fromById.get(element.id);
      return current ? !sameElement(current, element) : false;
    }),
  };
}

function sameSnapshot(left: WhiteboardSnapshot, right: WhiteboardSnapshot) {
  return (
    left.length === right.length &&
    left.every((element, index) => {
      const candidate = right[index];
      return candidate ? sameElement(element, candidate) : false;
    })
  );
}

function sameElement(left: BoardElementRow, right: BoardElementRow) {
  return (
    left.id === right.id &&
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height &&
    left.rotation === right.rotation &&
    left.z_index === right.z_index &&
    JSON.stringify(left.content) === JSON.stringify(right.content) &&
    JSON.stringify(left.style) === JSON.stringify(right.style) &&
    JSON.stringify(left.metadata) === JSON.stringify(right.metadata)
  );
}
