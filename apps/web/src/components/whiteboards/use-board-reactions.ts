"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BoardReactionKind,
  BoardReactionRow,
  BoardReactionSummary,
  BoardRow,
  BoardCommentRow,
} from "@/lib/supabase/database.types";
import { setBoardReactionAction } from "@/modules/whiteboards/actions";
import { readBoardReactionsAction } from "@/modules/whiteboards/read-actions";
export function useBoardReactions(
  board: BoardRow,
  userId: string,
  ids: string[],
  canMutate: boolean,
) {
  const [rows, setRows] = useState<BoardReactionSummary[]>([]),
    [pending, setPending] = useState<string[]>([]),
    [revision, setRevision] = useState(0),
    [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ element_id: string; total: number }[]>(
      [],
    ),
    [countsLoaded, setCountsLoaded] = useState(false);
  const current = useRef(rows),
    visible = useRef(ids),
    inFlight = useRef(new Set<string>());
  useEffect(() => {
    current.current = rows;
  }, [rows]);
  useEffect(() => {
    visible.current = ids;
  }, [ids]);
  const signature = ids.slice(0, 200).sort().join(",");
  useEffect(() => {
    if (!signature || pending.length) return;
    let alive = true;
    const timer = setTimeout(() => {
      void readBoardReactionsAction({
        boardId: board.id,
        organizationId: board.organization_id,
        ids: signature.split(","),
      })
        .then((result) => {
          if (!alive) return;
          if (result.status === "success") {
            setRows(result.rows);
            if (result.commentCounts !== undefined) {
              setCounts(result.commentCounts);
              setCountsLoaded(true);
            }
            setError(null);
          } else {
            setRows([]);
            setCounts([]);
            setCountsLoaded(true);
            setError(result.message);
          }
        })
        .catch(() => {
          if (alive) {
            setRows([]);
            setError("Reactions could not load. Retry reactions.");
          }
        });
    }, 100);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [board.id, board.organization_id, signature, revision, pending.length]);
  const receive = useCallback(
    (row: BoardReactionRow) => {
      if (
        row.organization_id === board.organization_id &&
        row.board_id === board.id &&
        visible.current.includes(row.element_id)
      )
        setRevision((n) => n + 1);
    },
    [board.id, board.organization_id],
  );
  const receiveComment = useCallback(
    (row: BoardCommentRow) => {
      if (
        row.organization_id === board.organization_id &&
        row.board_id === board.id &&
        row.element_id &&
        visible.current.includes(row.element_id)
      )
        setRevision((n) => n + 1);
    },
    [board.id, board.organization_id],
  );
  const toggle = useCallback(
    async (elementId: string, reaction: BoardReactionKind) => {
      const key = elementId + ":" + reaction;
      if (
        !canMutate ||
        inFlight.current.has(key) ||
        !visible.current.includes(elementId)
      )
        return;
      inFlight.current.add(key);
      setPending((keys) => [...keys, key]);
      setError(null);
      const previous = current.current.find(
          (row) => row.element_id === elementId && row.reaction === reaction,
        ),
        active = !previous?.mine;
      const changed: BoardReactionSummary = {
        element_id: elementId,
        reaction,
        total: Math.max(0, (previous?.total ?? 0) + (active ? 1 : -1)),
        mine: active,
        participants: active
          ? [...new Set([userId, ...(previous?.participants ?? [])])].slice(
              0,
              20,
            )
          : (previous?.participants ?? []).filter((id) => id !== userId),
      };
      setRows((rows) => [
        ...rows.filter(
          (row) => row.element_id !== elementId || row.reaction !== reaction,
        ),
        changed,
      ]);
      try {
        const result = await setBoardReactionAction({
          boardId: board.id,
          elementId,
          reaction,
          active,
        });
        if (result.status === "error") throw Error(result.message);
      } catch {
        setRows((rows) => [
          ...rows.filter(
            (row) => row.element_id !== elementId || row.reaction !== reaction,
          ),
          ...(previous ? [previous] : []),
        ]);
        setError(
          "Reaction could not save. Your previous reaction was restored.",
        );
      } finally {
        inFlight.current.delete(key);
        setPending((keys) => keys.filter((k) => k !== key));
        setRevision((n) => n + 1);
      }
    },
    [board.id, canMutate, userId],
  );
  return {
    rows,
    counts,
    countsLoaded,
    pending,
    error,
    toggle,
    receive,
    receiveComment,
    retry: () => setRevision((n) => n + 1),
  };
}
