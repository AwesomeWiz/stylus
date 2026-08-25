import { describe, expect, it } from "vitest";

import type { BoardElementRow } from "@/lib/supabase/database.types";

import {
  createWhiteboardHistory,
  diffWhiteboardSnapshots,
  recordWhiteboardHistory,
  reconcileRemoteElement,
  redoWhiteboardHistory,
  undoWhiteboardHistory,
} from "./history";

const element = (id: string, x = 0): BoardElementRow => ({
  archived_at: null,
  board_id: "b",
  content: { text: id },
  created_at: "2026-08-25T00:00:00Z",
  created_by: "u",
  element_type: "TEXT",
  height: 80,
  id,
  metadata: {},
  organization_id: "o",
  rotation: 0,
  style: {},
  updated_at: "2026-08-25T00:00:00Z",
  updated_by: "u",
  width: 200,
  x,
  y: 0,
  z_index: 1,
});

describe("whiteboard history", () => {
  it("undoes and redoes one recorded operation", () => {
    const initial = createWhiteboardHistory([element("one")]);
    const moved = recordWhiteboardHistory(initial, [element("one", 40)]);
    const undone = undoWhiteboardHistory(moved);
    expect(undone.present[0]?.x).toBe(0);
    expect(redoWhiteboardHistory(undone).present[0]?.x).toBe(40);
  });

  it("clears redo when a new edit follows undo", () => {
    const initial = createWhiteboardHistory([element("one")]);
    const moved = recordWhiteboardHistory(initial, [element("one", 40)]);
    const changed = recordWhiteboardHistory(undoWhiteboardHistory(moved), [
      element("one", 20),
    ]);
    expect(changed.future).toHaveLength(0);
  });

  it("bounds history to the configured size", () => {
    let history = createWhiteboardHistory([element("one")]);
    for (let x = 1; x <= 5; x += 1)
      history = recordWhiteboardHistory(history, [element("one", x)], 3);
    expect(history.past).toHaveLength(3);
  });

  it("diffs create, archive, restore and element changes", () => {
    const from = [element("remove"), element("change")];
    const to = [element("change", 10), element("restore")];
    expect(diffWhiteboardSnapshots(from, to)).toEqual({
      archiveIds: ["remove"],
      restore: [expect.objectContaining({ id: "restore" })],
      update: [expect.objectContaining({ id: "change", x: 10 })],
    });
  });

  it("undoes only the local element while preserving a remote insert", () => {
    const initial = createWhiteboardHistory([element("local")]);
    const moved = recordWhiteboardHistory(initial, [element("local", 40)]);
    const withRemote = reconcileRemoteElement(moved, element("remote", 90));
    expect(undoWhiteboardHistory(withRemote).present).toEqual([
      expect.objectContaining({ id: "local", x: 0 }),
      expect.objectContaining({ id: "remote", x: 90 }),
    ]);
  });

  it("does not place remote changes in local undo history", () => {
    const initial = createWhiteboardHistory([element("one")]);
    const remote = reconcileRemoteElement(initial, element("two"));
    expect(remote.past).toHaveLength(0);
    expect(undoWhiteboardHistory(remote)).toBe(remote);
  });

  it("preserves unrelated redo and invalidates same-element history", () => {
    const initial = createWhiteboardHistory([element("one"), element("two")]);
    const moved = recordWhiteboardHistory(initial, [
      element("one", 40),
      element("two"),
    ]);
    const undone = undoWhiteboardHistory(moved);
    const unrelated = reconcileRemoteElement(undone, element("two", 50));
    expect(redoWhiteboardHistory(unrelated).present).toEqual([
      expect.objectContaining({ id: "one", x: 40 }),
      expect.objectContaining({ id: "two", x: 50 }),
    ]);
    expect(
      reconcileRemoteElement(undone, element("one", 80)).future,
    ).toHaveLength(0);
  });
});
