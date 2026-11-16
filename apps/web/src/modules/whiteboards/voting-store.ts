import type {
  BoardVoteRow,
  BoardVotingSnapshot,
} from "@/lib/supabase/database.types";
import { emptyVoting, projectVoting } from "./voting";

export type VotingObjectState = {
  session: string | null;
  status: "ACTIVE" | "ENDED" | null;
  total: number;
  mine: number;
  participants: string[];
  eligible: string[];
  canAdd: boolean;
  canRemove: boolean;
  pending: boolean;
  visible: boolean;
};
export function createBoardVotingStore(userId: string, canVote: boolean) {
  let base = emptyVoting,
    overlay: BoardVoteRow | null = null,
    error: string | null = null,
    loading = true,
    dismissed: string | null = null,
    presenting = false,
    needsRefresh = false;
  let errorKind: "read" | "mutation" | null = null;
  let state: {
    data: BoardVotingSnapshot;
    error: string | null;
    loading: boolean;
    pending: boolean;
    remaining: number;
    needsRefresh: boolean;
  } = {
    data: base,
    error,
    loading,
    pending: false,
    remaining: 0,
    needsRefresh,
  };
  const listeners = new Set<() => void>(),
    cache = new Map<string, VotingObjectState>();
  let summaries = new Map<string, BoardVotingSnapshot["summaries"][number]>();
  const commands: {
    vote: (id: string, active: boolean) => void;
    refresh: () => void;
  } = {
    vote: () => {},
    refresh: () => {},
  };
  function publish() {
    const own =
      overlay && base.session?.status === "ACTIVE"
        ? [
            ...base.own_votes.filter((row) => row.slot !== overlay!.slot),
            overlay,
          ]
        : base.own_votes;
    const data = overlay ? projectVoting(base, own, userId) : base;
    state = {
      data,
      error,
      loading,
      pending: !!overlay,
      needsRefresh,
      remaining: Math.max(
        0,
        (data.session?.allowance ?? 0) -
          data.own_votes.filter((row) => row.active).length,
      ),
    };
    summaries = new Map(
      [...data.results, ...data.summaries].map((row) => [row.element_id, row]),
    );
    for (const listener of listeners) listener();
  }
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return {
    subscribe,
    getSnapshot: () => state,
    commands,
    bind(vote: (id: string, active: boolean) => void, refresh: () => void) {
      commands.vote = vote;
      commands.refresh = refresh;
    },
    getObject(id: string): VotingObjectState {
      const session = state.data.session,
        row = summaries.get(id);
      const next: VotingObjectState = {
        session: session?.id ?? null,
        status: session?.status ?? null,
        total: row?.total ?? 0,
        mine: row?.mine ?? 0,
        participants: row?.participants ?? [],
        eligible: session?.eligible_types ?? [],
        canAdd:
          canVote &&
          session?.status === "ACTIVE" &&
          state.remaining > 0 &&
          !needsRefresh &&
          overlay?.element_id !== id,
        canRemove:
          canVote &&
          session?.status === "ACTIVE" &&
          (row?.mine ?? 0) > 0 &&
          !needsRefresh &&
          overlay?.element_id !== id,
        pending: overlay?.element_id === id,
        visible: !presenting && !!session && dismissed !== session.id,
      };
      const previous = cache.get(id);
      if (previous && JSON.stringify(previous) === JSON.stringify(next))
        return previous;
      cache.set(id, next);
      return next;
    },
    accept(data: BoardVotingSnapshot, append = false) {
      if (
        append &&
        (base.session?.id !== data.session?.id ||
          base.session?.revision !== data.session?.revision)
      ) {
        commands.refresh();
        return;
      }
      if (
        base.session &&
        data.session &&
        base.session.id === data.session.id &&
        data.session.revision < base.session.revision
      )
        return;
      if (
        base.session &&
        data.session &&
        base.session.id !== data.session.id &&
        data.session.created_at < base.session.created_at
      )
        return;
      if (
        append &&
        base.session?.id === data.session?.id &&
        base.session?.revision === data.session?.revision
      ) {
        const seen = new Set(base.results.map((row) => row.element_id));
        base = {
          ...data,
          results: [
            ...base.results,
            ...data.results.filter((row) => !seen.has(row.element_id)),
          ],
        };
      } else base = data;
      loading = false;
      if (errorKind === "read") {
        error = null;
        errorKind = null;
      }
      needsRefresh = false;
      publish();
    },
    begin(vote: BoardVoteRow) {
      if (overlay) return false;
      overlay = vote;
      error = null;
      errorKind = null;
      publish();
      return true;
    },
    finish(vote: BoardVoteRow) {
      if (
        base.session?.id === vote.session_id &&
        base.session.status === "ACTIVE"
      ) {
        const current = base.own_votes.find((row) => row.slot === vote.slot);
        if (!current || current.version < vote.version)
          base = projectVoting(
            base,
            [...base.own_votes.filter((row) => row.slot !== vote.slot), vote],
            userId,
          );
      }
      overlay = null;
      publish();
    },
    fail(message: string) {
      overlay = null;
      error = message;
      errorKind = "mutation";
      loading = false;
      needsRefresh = true;
      publish();
    },
    readFailure(message: string, deny = false) {
      if (deny) {
        base = emptyVoting;
        overlay = null;
      }
      if (errorKind !== "mutation") {
        error = message;
        errorKind = "read";
      }
      loading = false;
      needsRefresh = true;
      publish();
    },
    setError(message: string | null) {
      error = message;
      errorKind = message ? "mutation" : null;
      publish();
    },
    setPresentation(value: boolean) {
      if (value !== presenting) {
        presenting = value;
        publish();
      }
    },
    dismiss() {
      dismissed = base.session?.id ?? null;
      publish();
    },
    reveal() {
      dismissed = null;
      publish();
    },
  };
}
export type BoardVotingStore = ReturnType<typeof createBoardVotingStore>;
