"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import { CircleDot, Minus, Plus } from "lucide-react";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import type { BoardVotingStore } from "@/modules/whiteboards/voting-store";
export const BoardVotingContext = createContext<BoardVotingStore | null>(null);
const noop = () => () => {};
const absent = () => null;
/** The small badge subscribes independently; vote counts never change node data. */
export function BoardVoteBadge({
  row,
  locked = false,
}: {
  row: BoardElementRow;
  locked?: boolean;
}) {
  const store = useContext(BoardVotingContext);
  const state = useSyncExternalStore(
    store?.subscribe ?? noop,
    store ? () => store.getObject(row.id) : absent,
    absent,
  );
  if (
    !state?.visible ||
    !state.eligible.includes(row.element_type) ||
    row.archived_at
  )
    return null;
  const active = state.status === "ACTIVE",
    participants = state.participants.length;
  if (!active && !state.total) return null;
  return (
    <div
      className="nodrag nopan nowheel bg-background text-foreground absolute -top-3 right-1 z-40 flex items-center gap-1 rounded border px-1 shadow-sm"
      role="group"
      aria-label="Object voting"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span
        className="flex items-center gap-1 px-1 text-xs"
        title={`${state.total} votes from ${participants}${participants === 20 ? "+" : ""} participants; ${state.mine} yours`}
      >
        <CircleDot aria-hidden className="size-3" />
        {state.total}
        <span className="sr-only"> votes; {state.mine} yours</span>
      </span>
      {active && !locked ? (
        <>
          <button
            type="button"
            className="hover:bg-muted flex min-h-10 min-w-10 items-center justify-center rounded"
            aria-label="Add vote to object"
            disabled={!state.canAdd}
            onClick={() => store?.commands.vote(row.id, true)}
          >
            <Plus aria-hidden className="size-3" />
          </button>
          {state.mine ? (
            <button
              type="button"
              className="hover:bg-muted flex min-h-10 min-w-10 items-center justify-center rounded"
              aria-label="Remove your vote from object"
              disabled={!state.canRemove}
              onClick={() => store?.commands.vote(row.id, false)}
            >
              <Minus aria-hidden className="size-3" />
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
