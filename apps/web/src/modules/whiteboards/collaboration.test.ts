import { describe, expect, it } from "vitest";

import type {
  BoardCommentRow,
  BoardElementRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import {
  allocateBoardCollaboratorColors,
  boardCollaboratorColor,
  boardCollaboratorPalette,
  boardCollaborationTopic,
  boardPresenceColor,
  boardPresenceInitials,
  chooseCommittedElement,
  flowPointToViewport,
  includeLocalBoardPresence,
  normalizeBoardCursorBroadcast,
  normalizeBoardPresence,
  reconcileBoardComment,
} from "./collaboration";

const element = {
  archived_at: null,
  board_id: "board",
  content: {},
  created_at: "2026-08-25T00:00:00Z",
  created_by: "user-a",
  element_type: "TEXT",
  height: 80,
  id: "element",
  metadata: {},
  organization_id: "organization",
  rotation: 0,
  style: {},
  updated_at: "2026-08-25T00:00:01Z",
  updated_by: "user-a",
  width: 200,
  x: 0,
  y: 0,
  z_index: 1,
} satisfies BoardElementRow;
const comment = {
  archived_at: null,
  author_id: "user-a",
  board_id: "board",
  body: "First",
  created_at: "2026-08-25T00:00:00Z",
  element_id: null,
  id: "comment-a",
  organization_id: "organization",
  parent_id: null,
  updated_at: "2026-08-25T00:00:00Z",
} satisfies BoardCommentRow;
const members: TaskMember[] = [
  { display_name: "Alex Morgan", member_user_id: "user-a", role: "MEMBER" },
  { display_name: "Alex Brown", member_user_id: "user-b", role: "VIEWER" },
  { display_name: "Casey Lee", member_user_id: "user-c", role: "ADMIN" },
];

describe("whiteboard collaboration reconciliation", () => {
  it("uses the database timestamp to resolve a same-element conflict", () => {
    const remote = { ...element, updated_at: "2026-08-25T00:00:02Z", x: 50 };
    expect(chooseCommittedElement(element, remote)).toBe(remote);
    expect(chooseCommittedElement(remote, element)).toBe(remote);
  });

  it("adds and replaces comments without duplicating realtime echoes", () => {
    expect(reconcileBoardComment([], comment)).toEqual([comment]);
    const archived = { ...comment, archived_at: "2026-08-25T00:01:00Z" };
    expect(reconcileBoardComment([comment], archived)).toEqual([archived]);
  });

  it("trusts the member directory rather than forged presence metadata", () => {
    expect(
      normalizeBoardPresence(
        {
          one: [{ displayName: "Impostor", role: "OWNER", userId: "user-a" }],
          two: [{ userId: "user-a" }, { userId: "outside" }],
        },
        members,
      ),
    ).toEqual([
      { displayName: "Alex Morgan", role: "MEMBER", userId: "user-a" },
    ]);
  });

  it("counts a present user without requiring cursor coordinates", () => {
    expect(
      normalizeBoardPresence(
        { one: [{ sessionId: "session-b", userId: "user-b" }] },
        members,
      ),
    ).toEqual([
      {
        displayName: "Alex Brown",
        role: "VIEWER",
        userId: "user-b",
      },
    ]);
  });

  it("explicitly includes the local member and deduplicates multiple sessions", () => {
    const local = { displayName: "Alex Morgan", id: "user-a" };
    const remote = normalizeBoardPresence(
      {
        first: [{ sessionId: "b-one", userId: "user-b" }],
        second: [{ sessionId: "b-two", userId: "user-b" }],
      },
      members,
    );
    expect(
      includeLocalBoardPresence(remote, local, members).map(
        (person) => person.userId,
      ),
    ).toEqual(["user-a", "user-b"]);
    expect(includeLocalBoardPresence([], local, members)).toHaveLength(1);
    expect(
      includeLocalBoardPresence(
        normalizeBoardPresence(
          {
            second: [{ sessionId: "b", userId: "user-b" }],
            third: [{ sessionId: "c", userId: "user-c" }],
          },
          members,
        ),
        local,
        members,
      ),
    ).toHaveLength(3);
  });

  it("keeps duplicate display names as distinct identities", () => {
    expect(
      normalizeBoardPresence(
        {
          first: [{ userId: "user-a" }],
          second: [{ userId: "user-b" }],
        },
        members,
      ).map((person) => person.userId),
    ).toEqual(["user-a", "user-b"]);
  });

  it("assigns a stable curated color from the trusted user identifier", () => {
    expect(boardPresenceColor("user-a")).toBe(boardPresenceColor("user-a"));
    expect(boardPresenceColor("user-a")).toMatch(/^var\(--collaborator-/);
    expect(boardPresenceInitials("Alex Morgan")).toBe("AM");
  });

  it("allocates distinct canonical colors across a typical active board", () => {
    const userIds = Array.from({ length: 8 }, (_, index) => `user-${index}`);
    const assignments = allocateBoardCollaboratorColors(userIds);
    expect(assignments).toEqual(allocateBoardCollaboratorColors(userIds));
    expect(new Set(Object.values(assignments)).size).toBe(8);
    expect(Object.keys(assignments)).toHaveLength(8);
    expect(boardCollaboratorPalette).toHaveLength(8);
  });

  it("resolves hash collisions while preserving stable colors through joins and leaves", () => {
    expect(boardPresenceColor("user-a")).toBe(boardPresenceColor("user-i"));
    const collision = allocateBoardCollaboratorColors(["user-a", "user-i"]);
    expect(collision["user-a"]).not.toBe(collision["user-i"]);

    const initial = allocateBoardCollaboratorColors(["local", "remote-a"]);
    expect(initial.local).not.toBe(initial["remote-a"]);

    const joined = allocateBoardCollaboratorColors(
      ["local", "remote-a", "remote-b"],
      initial,
    );
    expect(joined.local).toBe(initial.local);
    expect(joined["remote-a"]).toBe(initial["remote-a"]);
    expect(new Set(Object.values(joined)).size).toBe(3);

    const left = allocateBoardCollaboratorColors(["local", "remote-b"], joined);
    expect(left.local).toBe(initial.local);
    expect(left["remote-b"]).toBe(joined["remote-b"]);
  });

  it("deduplicates multiple sessions and uses one color for avatar, cursor and label", () => {
    const assignments = allocateBoardCollaboratorColors([
      "same-user",
      "same-user",
      "other-user",
    ]);
    expect(Object.keys(assignments)).toHaveLength(2);
    expect(assignments["same-user"]).not.toBe(assignments["other-user"]);
    expect(boardCollaboratorColor("same-user", assignments)).toEqual(
      boardCollaboratorColor("same-user", assignments),
    );
  });

  it("accepts a bounded broadcast only for an authorized present remote session", () => {
    const state = {
      session: [{ sessionId: "remote-session", userId: "user-b" }],
    };
    expect(
      normalizeBoardCursorBroadcast(
        { sessionId: "remote-session", x: 42, y: 18 },
        state,
        members,
        "user-a",
      ),
    ).toEqual({ cursor: { x: 42, y: 18 }, userId: "user-b" });
    expect(
      normalizeBoardCursorBroadcast(
        { sessionId: "unknown", x: 42, y: 18 },
        state,
        members,
        "user-a",
      ),
    ).toBeNull();
    expect(
      normalizeBoardCursorBroadcast(
        { sessionId: "remote-session", x: 2_000_000, y: 18 },
        state,
        members,
        "user-a",
      ),
    ).toBeNull();
  });

  it("rejects a local cursor broadcast and transforms flow coordinates", () => {
    expect(
      normalizeBoardCursorBroadcast(
        { sessionId: "local-session", x: 2, y: 3 },
        {
          session: [{ sessionId: "local-session", userId: "user-a" }],
        },
        members,
        "user-a",
      ),
    ).toBeNull();
    expect(
      flowPointToViewport({ x: 20, y: 30 }, { x: 5, y: 8, zoom: 2 }),
    ).toEqual({ x: 45, y: 68 });
  });

  it("isolates collaboration topics by both organization and board", () => {
    expect(boardCollaborationTopic("org-a", "board-a")).toBe(
      "board:org-a:board-a",
    );
    expect(boardCollaborationTopic("org-a", "board-a")).not.toBe(
      boardCollaborationTopic("org-a", "board-b"),
    );
    expect(boardCollaborationTopic("org-a", "board-a")).not.toBe(
      boardCollaborationTopic("org-b", "board-a"),
    );
  });
});
