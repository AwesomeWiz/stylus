"use client";
import { useEffect, useRef } from "react";
import type { BoardRow, BoardVoteRow } from "@/lib/supabase/database.types";
import type { BoardVotingStore } from "@/modules/whiteboards/voting-store";
import {
  startBoardVotingAction,
  setBoardVoteAction,
  endBoardVotingAction,
} from "@/modules/whiteboards/voting-actions";
import { readBoardVoting } from "@/modules/whiteboards/voting-client";
import { useBoardEvent } from "./use-board-event";
import type { votingTypes } from "@/modules/whiteboards/voting";

export function useBoardVoting(
  board: BoardRow,
  userId: string,
  ids: string[],
  canMutate: boolean,
  store: BoardVotingStore,
) {
  const alive = useRef(false),
    sequence = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    operation = useRef(false);
  const signature = [...new Set(ids)].sort().join(",");
  const refresh = useBoardEvent(
    async (after?: { total: number; id: string }) => {
      if (!userId || !alive.current) return;
      const request = ++sequence.current;
      try {
        const requested = signature ? signature.split(",") : [];
        const result = await readBoardVoting({
          boardId: board.id,
          organizationId: board.organization_id,
          ids: requested.slice(0, 200),
          ...(after ? { after } : {}),
        });
        if (!alive.current || request !== sequence.current) return;
        if (result.status === "success") {
          // Every request is bounded and freshly authorized. Publish only a
          // consistent revision; a concurrent vote schedules a fresh projection.
          const summaries = [...result.data.summaries];
          for (let offset = 200; offset < requested.length; offset += 200) {
            const part = await readBoardVoting({
              boardId: board.id,
              organizationId: board.organization_id,
              ids: requested.slice(offset, offset + 200),
            });
            if (!alive.current || request !== sequence.current) return;
            if (part.status === "error") {
              store.readFailure(
                "Voting could not refresh. Check access or retry.",
                part.code === "ACCESS",
              );
              return;
            }
            if (
              part.data.session?.id !== result.data.session?.id ||
              part.data.session?.revision !== result.data.session?.revision
            ) {
              store.commands.refresh();
              return;
            }
            summaries.push(...part.data.summaries);
          }
          store.accept({ ...result.data, summaries }, !!after);
        } else
          store.readFailure(
            "Voting could not refresh. Check access or retry.",
            result.code === "ACCESS",
          );
      } catch {
        if (alive.current && request === sequence.current)
          store.readFailure("Voting could not refresh. Retry when connected.");
      }
    },
  );
  const invalidate = useBoardEvent(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void refresh();
    }, 100);
  });
  const vote = useBoardEvent(async (elementId: string, active: boolean) => {
    const state = store.getSnapshot(),
      session = state.data.session;
    if (
      !canMutate ||
      !session ||
      session.status !== "ACTIVE" ||
      state.pending ||
      state.needsRefresh ||
      operation.current
    )
      return;
    if (active && state.remaining === 0) {
      store.setError(
        "You have used all your votes. Remove one to allocate it elsewhere.",
      );
      return;
    }
    const current = active
      ? Array.from({ length: session.allowance }, (_, i) => i + 1)
          .map((slot) => ({
            slot,
            row: state.data.own_votes.find((row) => row.slot === slot),
          }))
          .find((item) => !item.row?.active)
      : state.data.own_votes
          .filter((row) => row.active && row.element_id === elementId)
          .sort((a, b) => b.slot - a.slot)
          .map((row) => ({ slot: row.slot, row }))[0];
    if (!current) return;
    const optimistic: BoardVoteRow = {
      organization_id: board.organization_id,
      board_id: board.id,
      session_id: session.id,
      voter_id: userId,
      slot: current.slot,
      element_id: elementId,
      active,
      version: (current.row?.version ?? 0) + 1,
      request_id: crypto.randomUUID(),
      updated_at: new Date().toISOString(),
    };
    if (!store.begin(optimistic)) return;
    try {
      const result = await setBoardVoteAction({
        boardId: board.id,
        organizationId: board.organization_id,
        sessionId: session.id,
        elementId,
        slot: current.slot,
        active,
        requestId: optimistic.request_id,
        expectedVersion: current.row?.version ?? 0,
      });
      if (!alive.current) return;
      if (result.status === "success") store.finish(result.data);
      else store.fail(result.message);
    } catch {
      if (alive.current)
        store.fail(
          "Vote could not be confirmed. Refresh voting before retrying.",
        );
    } finally {
      if (alive.current) void refresh();
    }
  });
  useEffect(() => {
    sequence.current++;
    alive.current = true;
    store.bind((id, active) => void vote(id, active), invalidate);
    invalidate();
    window.addEventListener("focus", invalidate);
    window.addEventListener("online", invalidate);
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("focus", invalidate);
      window.removeEventListener("online", invalidate);
      store.bind(
        () => {},
        () => {},
      );
    };
  }, [board.id, board.organization_id, userId, store, vote, invalidate]);
  useEffect(() => {
    // Empty Boards have no counts to project. Session events/focus still refresh
    // discovery; merely panning must not refetch an absent voting session.
    const current = store.getSnapshot();
    if (!current.loading && !current.data.session) return;
    invalidate();
  }, [signature, invalidate, store]);
  const start = useBoardEvent(
    async (allowance: number, types: (typeof votingTypes)[number][]) => {
      if (!canMutate || operation.current) return false;
      operation.current = true;
      try {
        const result = await startBoardVotingAction({
          boardId: board.id,
          organizationId: board.organization_id,
          allowance,
          types,
        });
        if (!alive.current) return false;
        if (result.status === "error") {
          store.setError(result.message);
          return false;
        }
        // The successful start response is complete and permits immediate casts.
        operation.current = false;
        store.accept({
          session: result.data,
          own_votes: [],
          summaries: [],
          results: [],
          has_more: false,
        });
        await refresh();
        return true;
      } catch {
        store.setError("Voting could not start. Retry when connected.");
        return false;
      } finally {
        operation.current = false;
      }
    },
  );
  const end = useBoardEvent(async () => {
    const state = store.getSnapshot();
    if (!canMutate || operation.current || state.pending || !state.data.session)
      return false;
    operation.current = true;
    try {
      const result = await endBoardVotingAction({
        boardId: board.id,
        organizationId: board.organization_id,
        sessionId: state.data.session.id,
      });
      if (!alive.current) return false;
      if (result.status === "error") {
        store.setError(result.message);
        return false;
      }
      store.accept({ ...store.getSnapshot().data, session: result.data });
      await refresh();
      return true;
    } catch {
      store.setError("Voting could not end. Check the session and retry.");
      return false;
    } finally {
      operation.current = false;
    }
  });
  return {
    invalidate,
    start,
    end,
    loadMore: () => {
      const last = store.getSnapshot().data.results.at(-1);
      if (last) void refresh({ total: last.total, id: last.element_id });
    },
  };
}
