import { describe, it, expect } from "vitest";
import { object, board } from "@/test/board-fixtures";
import {
  emptyVoting,
  eligibleForVoting,
  projectVoting,
  startVotingSchema,
  voteSchema,
} from "./voting";
import { createBoardVotingStore } from "./voting-store";
import type {
  BoardVoteRow,
  BoardVotingSnapshot,
  BoardVotingSessionRow,
} from "@/lib/supabase/database.types";
const user = crypto.randomUUID(),
  other = crypto.randomUUID(),
  a = crypto.randomUUID(),
  b = crypto.randomUUID();
const session: BoardVotingSessionRow = {
  id: crypto.randomUUID(),
  organization_id: board.organization_id,
  board_id: board.id,
  status: "ACTIVE",
  allowance: 3,
  eligible_types: ["TEXT", "STICKY", "IMAGE", "SHAPE", "GROUP"],
  started_by: user,
  ended_by: null,
  created_at: board.created_at,
  updated_at: board.updated_at,
  ended_at: null,
  revision: 1,
};
const vote = (slot: number, element_id = a): BoardVoteRow => ({
  organization_id: board.organization_id,
  board_id: board.id,
  session_id: session.id,
  voter_id: user,
  slot,
  element_id,
  active: true,
  version: 1,
  request_id: crypto.randomUUID(),
  updated_at: board.updated_at,
});
const snapshot = (
  extra: Partial<BoardVotingSnapshot> = {},
): BoardVotingSnapshot => ({
  ...emptyVoting,
  session,
  summaries: [
    { element_id: a, total: 2, mine: 1, participants: [user, other] },
    { element_id: b, total: 1, mine: 0, participants: [other] },
  ],
  own_votes: [vote(1)],
  ...extra,
});
describe("structured voting", () => {
  it("bounds configuration, distinct eligible types and slot/version commands", () => {
    const scope = { boardId: board.id, organizationId: board.organization_id };
    expect(
      startVotingSchema.safeParse({
        ...scope,
        allowance: 3,
        types: ["TEXT", "GROUP"],
      }).success,
    ).toBe(true);
    for (const allowance of [0, 6, Infinity, 1.5])
      expect(
        startVotingSchema.safeParse({ ...scope, allowance, types: ["TEXT"] })
          .success,
      ).toBe(false);
    for (const types of [[], ["SECTION"], ["LINK"], ["TEXT", "TEXT"]])
      expect(
        startVotingSchema.safeParse({ ...scope, allowance: 3, types }).success,
      ).toBe(false);
    expect(
      voteSchema.safeParse({
        ...scope,
        sessionId: session.id,
        elementId: a,
        slot: 6,
        active: true,
        requestId: crypto.randomUUID(),
        expectedVersion: 0,
      }).success,
    ).toBe(false);
  });
  it("excludes archived/inherited locks and nonconfigured objects", () => {
    const group = object({ element_type: "GROUP", locked: true }),
      child = object({ element_type: "TEXT", parent_id: group.id });
    expect(eligibleForVoting(child, session, [group, child])).toBe(false);
    expect(
      eligibleForVoting(object({ element_type: "SECTION" }), session, []),
    ).toBe(false);
    expect(
      eligibleForVoting(
        object({ element_type: "IMAGE", archived_at: "2026-11-04" }),
        session,
        [],
      ),
    ).toBe(false);
    expect(
      eligibleForVoting(object({ element_type: "GROUP" }), session, []),
    ).toBe(true);
  });
  it("replaces only own contribution without double-counting a server echo", () => {
    const data = snapshot(),
      own = [...data.own_votes, vote(2)];
    const projected = projectVoting(data, own, user);
    expect(projected.summaries[0]).toMatchObject({ total: 3, mine: 2 });
    expect(projected.summaries[1]).toMatchObject({ total: 1, mine: 0 });
    expect(projectVoting(projected, own, user).summaries[0]).toMatchObject({
      total: 3,
      mine: 2,
    });
  });
  it("rolls back only pending own allocation while retaining remote updates", () => {
    const store = createBoardVotingStore(user, true);
    store.accept(snapshot());
    const beforeB = store.getObject(b);
    store.begin(vote(2));
    expect(store.getObject(a)).toMatchObject({ total: 3, mine: 2 });
    expect(store.getObject(b)).toBe(beforeB);
    store.accept(
      snapshot({
        session: { ...session, revision: 2 },
        summaries: [
          { element_id: a, total: 5, mine: 1, participants: [user, other] },
        ],
      }),
    );
    expect(store.getObject(a).total).toBe(6);
    store.fail("Offline");
    expect(store.getObject(a)).toMatchObject({ total: 5, mine: 1 });
    expect(store.getSnapshot().remaining).toBe(2);
    expect(store.getSnapshot().needsRefresh).toBe(true);
  });
  it("reconciles own echo once, rejects old revisions and freezes ended writes", () => {
    const store = createBoardVotingStore(user, true);
    store.accept(snapshot());
    const next = vote(2);
    store.begin(next);
    store.accept(
      snapshot({
        session: { ...session, revision: 3 },
        own_votes: [vote(1), next],
        summaries: [
          { element_id: a, total: 3, mine: 2, participants: [user, other] },
        ],
      }),
    );
    store.finish(next);
    expect(store.getObject(a).total).toBe(3);
    store.accept(snapshot());
    expect(store.getObject(a).total).toBe(3);
    store.accept(
      snapshot({
        session: {
          ...session,
          status: "ENDED",
          ended_at: board.updated_at,
          revision: 4,
        },
      }),
    );
    expect(store.getObject(a).canAdd).toBe(false);
    store.dismiss();
    expect(store.getObject(a).visible).toBe(false);
    store.reveal();
    expect(store.getObject(a).visible).toBe(true);
  });
  it("read denial purges private counts and presentation hides voting chrome", () => {
    const store = createBoardVotingStore(user, false);
    store.accept(snapshot());
    expect(store.getObject(a).canAdd).toBe(false);
    store.setPresentation(true);
    expect(store.getObject(a).visible).toBe(false);
    store.setPresentation(false);
    store.readFailure("Unavailable", true);
    expect(store.getSnapshot().data).toEqual(emptyVoting);
    expect(store.getObject(a).visible).toBe(false);
  });
});
