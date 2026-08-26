import { describe, expect, it } from "vitest";

import type {
  BoardCommentRow,
  BoardElementRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import {
  chooseCommittedElement,
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
  { display_name: "Alex", member_user_id: "user-a", role: "MEMBER" },
  { display_name: "Alex", member_user_id: "user-b", role: "VIEWER" },
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
    ).toEqual([{ displayName: "Alex", role: "MEMBER", userId: "user-a" }]);
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
});
