"use client";
import {
  useImperativeHandle,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import { CircleDot, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type {
  BoardElementRow,
  BoardRow,
  OrganizationRole,
  TaskMember,
} from "@/lib/supabase/database.types";
import type { BoardObjectIndex } from "@/modules/whiteboards/operations";
import { objectTitle } from "@/modules/whiteboards/operations";
import {
  eligibleForVoting,
  votingTypes,
  votingTypeLabels,
} from "@/modules/whiteboards/voting";
import type { BoardVotingStore } from "@/modules/whiteboards/voting-store";
import { BoardSelect } from "./board-select";
import { useBoardVoting } from "./use-board-voting";

export type BoardVotingHandle = { invalidate: () => void };
export function BoardVoting({
  board,
  userId,
  canMutate,
  role,
  members,
  ids,
  selected,
  index,
  store,
  onLocate,
  ref,
}: {
  board: BoardRow;
  userId: string;
  canMutate: boolean;
  role?: OrganizationRole;
  members: TaskMember[];
  ids: string[];
  selected: string[];
  index: BoardObjectIndex;
  store: BoardVotingStore;
  onLocate: (id: string) => void;
  ref: Ref<BoardVotingHandle>;
}) {
  const state = useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getSnapshot,
    ),
    api = useBoardVoting(board, userId, ids, canMutate, store);
  useImperativeHandle(ref, () => ({ invalidate: api.invalidate }), [
    api.invalidate,
  ]);
  const [open, setOpen] = useState(false),
    [confirmEnd, setConfirmEnd] = useState(false),
    [working, setWorking] = useState(false),
    [configuring, setConfiguring] = useState(false),
    [allowance, setAllowance] = useState("3"),
    [types, setTypes] = useState<(typeof votingTypes)[number][]>([
      ...votingTypes,
    ]);
  const session = state.data.session,
    active = session?.status === "ACTIVE",
    canEnd =
      canMutate &&
      !!session &&
      (session.started_by === userId || role === "OWNER" || role === "ADMIN");
  const ownObjects = [
    ...new Set(
      state.data.own_votes
        .filter((vote) => vote.active)
        .map((vote) => vote.element_id),
    ),
  ];
  const selection =
    selected.length === 1 ? index.byId.get(selected[0]!) : undefined;
  const selectable =
    selection &&
    eligibleForVoting(selection, session, [...index.byId.values()]);
  const title = (id: string) => {
    const row = index.byId.get(id);
    return row ? objectTitle(row) : "Unavailable object";
  };
  const voteButtons = (row: BoardElementRow) => (
    <div className="flex items-center gap-2">
      <Button
        aria-label={`Add vote to ${objectTitle(row)}`}
        size="icon"
        disabled={
          !canMutate ||
          !active ||
          state.pending ||
          state.needsRefresh ||
          state.remaining === 0 ||
          !eligibleForVoting(row, session, [...index.byId.values()])
        }
        onClick={() => store.commands.vote(row.id, true)}
        variant="secondary"
      >
        <Plus aria-hidden className="size-4" />
      </Button>
      <Button
        aria-label={`Remove your vote from ${objectTitle(row)}`}
        size="icon"
        disabled={
          !canMutate ||
          !active ||
          state.pending ||
          !state.data.own_votes.some((v) => v.active && v.element_id === row.id)
        }
        onClick={() => store.commands.vote(row.id, false)}
        variant="ghost"
      >
        <Minus aria-hidden className="size-4" />
      </Button>
    </div>
  );
  return (
    <>
      {state.error && !open ? (
        <div
          role="alert"
          className="bg-background fixed top-16 left-1/2 z-50 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center gap-2 rounded border p-3 text-sm"
        >
          <p>{state.error}</p>
          <Button variant="secondary" onClick={api.invalidate}>
            Refresh voting
          </Button>
          <Button variant="ghost" onClick={() => store.setError(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        aria-label={
          active
            ? "Voting in progress"
            : session
              ? "Voting results"
              : canMutate
                ? "Start voting"
                : "Voting"
        }
        title={
          active
            ? `${state.remaining} of ${session.allowance} votes remaining`
            : "Voting"
        }
        onClick={() => {
          store.reveal();
          setOpen(true);
        }}
      >
        <CircleDot aria-hidden className="size-4" />
        {active ? (
          <span className="sr-only">{state.remaining} remaining</span>
        ) : null}
      </Button>
      {active ? (
        <span
          role="status"
          aria-live={open ? "off" : "polite"}
          aria-atomic="true"
          className="text-muted-foreground max-w-24 text-xs sm:max-w-none"
        >
          {canMutate
            ? `${state.remaining} / ${session.allowance} votes left`
            : "Voting in progress"}
        </span>
      ) : null}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setConfirmEnd(false);
        }}
        title={
          configuring && !active
            ? "Start voting"
            : active
              ? "Voting in progress"
              : session
                ? "Voting results"
                : "Start voting"
        }
        description="Reactions are social feedback. Voting is a structured, visible decision."
      >
        <div className="max-h-[70dvh] space-y-5 overflow-y-auto p-5">
          {state.error ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>{state.error}</p>
              <Button variant="secondary" onClick={api.invalidate}>
                Retry voting
              </Button>
            </div>
          ) : null}
          {state.loading ? (
            <p role="status" className="text-sm">
              Loading voting…
            </p>
          ) : !session || (configuring && !active) ? (
            <>
              {canMutate ? (
                <>
                  <BoardSelect
                    label="Votes per person"
                    value={allowance}
                    onChange={setAllowance}
                    options={[1, 2, 3, 4, 5].map((n) => ({
                      value: String(n),
                      label: String(n),
                    }))}
                  />
                  <fieldset className="space-y-1">
                    <legend className="mb-2 text-sm font-medium">
                      Eligible objects
                    </legend>
                    {votingTypes.map((type) => (
                      <label
                        key={type}
                        className="flex min-h-11 items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={types.includes(type)}
                          onChange={(e) =>
                            setTypes((current) =>
                              e.target.checked
                                ? [...current, type]
                                : current.filter((t) => t !== type),
                            )
                          }
                        />
                        {votingTypeLabels[type]}
                      </label>
                    ))}
                  </fieldset>
                  <p className="text-muted-foreground text-xs">
                    Visible voting. Allocate several votes to one object or
                    spread them out. Locked objects, Sections and connectors are
                    excluded.
                  </p>
                  <Button
                    disabled={working || !types.length}
                    onClick={async () => {
                      setWorking(true);
                      if (await api.start(Number(allowance), types))
                        setConfiguring(false);
                      setWorking(false);
                    }}
                  >
                    {working ? "Starting…" : "Start voting"}
                  </Button>
                </>
              ) : (
                <p className="text-sm">
                  An editor can start a voting session. You can read its results
                  here.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                {active
                  ? `${session.allowance} votes per person. Multiple votes on one object are allowed.`
                  : "Voting ended. Allocations are frozen."}
              </p>
              {active && canMutate ? (
                <>
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-sm font-medium"
                  >
                    {state.remaining} of {session.allowance} votes remaining
                  </p>
                  {selectable ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {objectTitle(selection)}
                      </span>
                      {voteButtons(selection)}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Select an eligible object on the canvas or in Layers to
                      vote. Counts and voting controls are also available on
                      objects.
                    </p>
                  )}
                  {ownObjects.length ? (
                    <section aria-label="Your allocations">
                      <h3 className="mb-2 text-sm font-medium">
                        Your allocations
                      </h3>
                      <ul className="space-y-2">
                        {ownObjects.map((id) => (
                          <li
                            key={id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {title(id)} ·{" "}
                              {
                                state.data.own_votes.filter(
                                  (v) => v.active && v.element_id === id,
                                ).length
                              }
                            </span>
                            <Button
                              variant="ghost"
                              disabled={state.pending}
                              onClick={() => store.commands.vote(id, false)}
                              aria-label={`Remove your vote from ${title(id)}`}
                            >
                              Remove one
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </>
              ) : null}
              <section aria-label="Ranked voting results">
                <h3 className="mb-2 text-sm font-medium">
                  {active ? "Current results" : "Results"}
                </h3>
                {state.data.results.length ? (
                  <ol className="space-y-2">
                    {state.data.results.map((result) => (
                      <li
                        key={result.element_id}
                        className="rounded border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            #{result.rank}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {title(result.element_id)}
                          </span>
                          <Button
                            variant="ghost"
                            disabled={!index.byId.has(result.element_id)}
                            onClick={() => {
                              setOpen(false);
                              onLocate(result.element_id);
                            }}
                          >
                            Locate
                          </Button>
                        </div>
                        <details className="text-muted-foreground text-xs">
                          <summary className="cursor-pointer py-2">
                            {result.total} votes · {result.mine} yours ·
                            Participants
                          </summary>
                          <ul className="space-y-1">
                            {result.participants.map((id) => (
                              <li key={id}>
                                {members.find(
                                  (member) => member.member_user_id === id,
                                )?.display_name ?? "Former member"}
                              </li>
                            ))}
                          </ul>
                          {result.participants.length === 20 ? (
                            <p>Showing up to 20 participants.</p>
                          ) : null}
                        </details>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground text-sm">No votes yet.</p>
                )}
                {state.data.has_more ? (
                  <Button
                    className="mt-3"
                    variant="secondary"
                    onClick={api.loadMore}
                  >
                    More results
                  </Button>
                ) : null}
                <p className="text-muted-foreground mt-2 text-xs">
                  Equal totals share a rank. Object identity provides stable
                  order within ties.
                </p>
              </section>
              {active && canEnd ? (
                confirmEnd ? (
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm">
                      End voting? No more votes can be cast afterward.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={working}
                        onClick={() => setConfirmEnd(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={working || state.pending}
                        onClick={async () => {
                          setWorking(true);
                          if (await api.end()) setConfirmEnd(false);
                          setWorking(false);
                        }}
                      >
                        {working ? "Ending…" : "End voting"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    disabled={state.pending}
                    onClick={() => setConfirmEnd(true)}
                  >
                    End voting
                  </Button>
                )
              ) : null}
              {!active ? (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      store.dismiss();
                      setOpen(false);
                    }}
                  >
                    Hide canvas results
                  </Button>
                  {canMutate ? (
                    <Button onClick={() => setConfiguring(true)}>
                      Start another vote
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}
