"use client";
import { useCallback, useRef, useState } from "react";
import type { BoardElementRow, BoardRow } from "@/lib/supabase/database.types";
import { applyBoardOperationAction } from "@/modules/whiteboards/actions";
import {
  chooseCommittedElement,
  compareBoardTimestamps,
} from "@/modules/whiteboards/collaboration";
import {
  sameElement,
  createWhiteboardHistory,
  recordWhiteboardHistory,
  reconcileRemoteElement,
  redoWhiteboardHistory,
  undoWhiteboardHistory,
  type WhiteboardHistory,
} from "@/modules/whiteboards/history";
import { boardOperationSchema } from "@/modules/whiteboards/schemas";
import {
  expandedIds,
  operationPayload,
} from "@/modules/whiteboards/operations";

/** One local history operation and one database transaction per user intent. */
export function useBoardDocument(
  board: BoardRow,
  elements: BoardElementRow[],
  canMutate: boolean,
) {
  const [history, setHistory] = useState(() =>
    createWhiteboardHistory(elements),
  );
  const current = useRef(history);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<string | null>(null);
  const locked = useRef(false);
  const retry = useRef<(() => Promise<void>) | null>(null);
  const active = useRef(new Set<string>());
  const queued = useRef(new Map<string, BoardElementRow>());
  const echoes = useRef(new Map<string, string>());
  const revision = useRef(0);
  const committed = useRef(new Map(elements.map((row) => [row.id, row])));
  const retryScope = useRef(new Set<string>());
  const retryAllowed = useRef(true);

  const publish = useCallback((value: WhiteboardHistory) => {
    current.current = value;
    setHistory(value);
  }, []);
  const applyRemote = useCallback(
    (row: BoardElementRow, own = false) => {
      const previous = committed.current.get(row.id);
      if (
        previous &&
        compareBoardTimestamps(previous.updated_at, row.updated_at) > 0
      )
        return;
      committed.current.set(row.id, row);
      publish(
        reconcileRemoteElement(current.current, row, { preserveHistory: own }),
      );
    },
    [publish],
  );
  const receive = useCallback(
    (row: BoardElementRow) => {
      if (
        row.board_id !== board.id ||
        row.organization_id !== board.organization_id
      )
        return;
      const previous = committed.current.get(row.id);
      if (previous) {
        const order = compareBoardTimestamps(
          previous.updated_at,
          row.updated_at,
        );
        const own = echoes.current.get(row.id);
        if (
          order > 0 ||
          (order === 0 &&
            (sameElement(previous, row) ||
              (own && compareBoardTimestamps(own, row.updated_at) === 0)))
        )
          return;
      }
      committed.current.set(row.id, row);
      revision.current++;
      if (errorRef.current && retryScope.current.has(row.id)) {
        const message =
          "A collaborator changed an object while its save was failing. Reload the board before continuing.";
        retry.current = null;
        setRetryAvailable(false);
        errorRef.current = message;
        setError(message);
      }
      if (echoes.current.get(row.id) === row.updated_at) {
        echoes.current.delete(row.id);
        applyRemote(row, true);
        return;
      }
      if (active.current.has(row.id)) {
        const before = queued.current.get(row.id);
        queued.current.set(
          row.id,
          !before ||
            compareBoardTimestamps(row.updated_at, before.updated_at) >= 0
            ? row
            : before,
        );
        return;
      }
      applyRemote(row);
    },
    [applyRemote, board.id, board.organization_id],
  );
  const finish = useCallback(
    (id: string, persisted: BoardElementRow | null) => {
      active.current.delete(id);
      const remote = queued.current.get(id);
      queued.current.delete(id);
      const winner = remote
        ? chooseCommittedElement(persisted, remote)
        : persisted;
      if (winner) {
        if (winner === persisted) echoes.current.set(id, winner.updated_at);
        applyRemote(winner, winner === persisted);
      }
    },
    [applyRemote],
  );
  const run = useCallback(
    async (operation: () => Promise<void>) => {
      if (locked.current || !canMutate) return false;
      locked.current = true;
      setPending(true);
      errorRef.current = null;
      setError(null);
      setFailed(false);
      setRetryAvailable(false);
      retryAllowed.current = true;
      revision.current++;
      try {
        await operation();
        retry.current = null;
        return true;
      } catch (caught) {
        const cause =
          caught instanceof Error
            ? caught.message
            : "The operation could not be saved.";
        const message = retryAllowed.current
          ? cause
          : "The board changed before this save could be confirmed. Reload the board before continuing.";
        errorRef.current = message;
        setError(message);
        setFailed(true);
        retry.current = retryAllowed.current ? operation : null;
        setRetryAvailable(retryAllowed.current);
        return false;
      } finally {
        locked.current = false;
        setPending(false);
      }
    },
    [canMutate],
  );

  const persist = useCallback(
    async (before: BoardElementRow[], after: BoardElementRow[]) => {
      const payload = operationPayload(board.id, before, after);
      const ids = expandedIds(before, [
        ...payload.archiveIds,
        ...payload.upserts.map((row) => row.id),
      ]);
      retryScope.current = ids;
      ids.forEach((id) => active.current.add(id));
      let persisted: BoardElementRow[] = [];
      try {
        const result = await applyBoardOperationAction(payload);
        if (result.status === "error") throw new Error(result.message);
        persisted = result.data;
      } finally {
        if (!persisted.length && [...ids].some((id) => queued.current.has(id)))
          retryAllowed.current = false;
        const byId = new Map(persisted.map((row) => [row.id, row]));
        for (const id of new Set([...ids, ...byId.keys()]))
          finish(id, byId.get(id) ?? null);
      }
    },
    [board.id, finish],
  );
  const commit = useCallback(
    (after: BoardElementRow[]) => {
      if (locked.current || !canMutate) return Promise.resolve(false);
      if (errorRef.current) return Promise.resolve(false); // Retry/undo/reload first: never call an unsaved remainder "Saved".
      const before = current.current;
      const next = recordWhiteboardHistory(before, after);
      if (next === before) return Promise.resolve(true);
      try {
        const parsed = boardOperationSchema.safeParse(
          operationPayload(board.id, before.present, after),
        );
        if (!parsed.success)
          throw new Error(
            parsed.error.issues[0]?.message ?? "Check object fields.",
          );
      } catch (caught) {
        setError(String((caught as Error).message));
        return Promise.resolve(false);
      }
      publish(next);
      return run(() => persist(before.present, after));
    },
    [board.id, canMutate, persist, publish, run],
  );
  const navigate = useCallback(
    (direction: "UNDO" | "REDO") => {
      if (locked.current || !canMutate) return;
      if (errorRef.current && (direction !== "UNDO" || !retry.current)) return;
      const before = current.current;
      const next =
        direction === "UNDO"
          ? undoWhiteboardHistory(before)
          : redoWhiteboardHistory(before);
      if (next === before) return;
      publish(next);
      void run(() => persist(before.present, next.present));
    },
    [canMutate, persist, publish, run],
  );
  const adopt = useCallback(
    (row: BoardElementRow, created = true) => {
      revision.current++;
      // Realtime can deliver a new image before the upload action returns.
      const base = current.current.present.filter((item) => item.id !== row.id);
      const before = created
        ? { ...current.current, present: base }
        : current.current;
      publish(recordWhiteboardHistory(before, [...base, row]));
      echoes.current.set(row.id, row.updated_at);
      finish(row.id, row);
    },
    [finish, publish],
  );
  const retrySave = useCallback(() => {
    if (retry.current) void run(retry.current);
  }, [run]);
  const startInteraction = useCallback((id: string) => {
    for (const child of expandedIds(current.current.present, [id]))
      active.current.add(child);
  }, []);
  const cancelInteraction = useCallback(
    (id: string) => {
      for (const child of expandedIds(current.current.present, [id]))
        finish(child, null);
    },
    [finish],
  );
  const isBusy = useCallback(() => locked.current, []);
  const isDirty = useCallback(
    () => locked.current || Boolean(errorRef.current),
    [],
  );
  const dismissError = useCallback(() => {
    if (!errorRef.current) setError(null);
  }, []);
  const getRows = useCallback(() => current.current.present, []);
  const getRevision = useCallback(() => revision.current, []);
  const mergeSnapshot = useCallback(
    (rows: BoardElementRow[], expectedRevision: number) => {
      if (
        locked.current ||
        errorRef.current ||
        active.current.size ||
        revision.current !== expectedRevision
      )
        return false;
      let next = current.current;
      for (const row of rows) {
        const previous = committed.current.get(row.id);
        if (
          previous &&
          compareBoardTimestamps(previous.updated_at, row.updated_at) > 0
        )
          continue;
        committed.current.set(row.id, row);
        if (
          !sameElement(
            next.present.find((entry) => entry.id === row.id) ?? null,
            row,
          )
        )
          next = reconcileRemoteElement(next, row);
      }
      const presentIds = new Set(rows.map((row) => row.id));
      for (const row of next.present)
        if (!presentIds.has(row.id)) {
          const archived = {
            ...row,
            archived_at: new Date().toISOString(),
          };
          committed.current.set(row.id, archived);
          next = reconcileRemoteElement(next, archived);
        }
      publish(next);
      revision.current++;
      return true;
    },
    [publish],
  );
  return {
    getRows,
    getRevision,
    mergeSnapshot,
    dirty: pending || failed,
    history,
    rows: history.present,
    current,
    pending,
    error,
    commit,
    navigate,
    receive,
    adopt,
    perform: run,
    retry: retrySave,
    startInteraction,
    cancelInteraction,
    isBusy,
    isDirty,
    dismissError,
    hasRetry: failed && retryAvailable,
  };
}
