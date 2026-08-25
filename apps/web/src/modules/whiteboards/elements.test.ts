import { describe, expect, it } from "vitest";

import type { BoardElementRow } from "@/lib/supabase/database.types";

import { defaultElementData, nextZIndex, reorderElement } from "./elements";

function element(id: string, zIndex: number): BoardElementRow {
  return {
    archived_at: null,
    board_id: "b",
    content: {},
    created_at: "2026-08-25T00:00:00Z",
    created_by: "u",
    element_type: "SHAPE",
    height: 100,
    id,
    metadata: {},
    organization_id: "o",
    rotation: 0,
    style: {},
    updated_at: "2026-08-25T00:00:00Z",
    updated_by: "u",
    width: 100,
    x: 0,
    y: 0,
    z_index: zIndex,
  };
}

describe("whiteboard element behavior", () => {
  it("provides persisted defaults for text and sticky content", () => {
    expect(defaultElementData("TEXT").content).toEqual({ text: "Text" });
    expect(defaultElementData("STICKY").content).toEqual({ text: "New idea" });
  });

  it("allocates a deterministic next z-index", () => {
    expect(nextZIndex([element("b", 8), element("a", 2)])).toBe(9);
  });

  it("brings an element forward exactly one layer", () => {
    const result = reorderElement(
      [element("a", 1), element("b", 2), element("c", 3)],
      "a",
      "FORWARD",
    );
    expect(
      result
        .sort((left, right) => left.z_index - right.z_index)
        .map(({ id }) => id),
    ).toEqual(["b", "a", "c"]);
  });

  it("normalizes duplicate z-indexes deterministically", () => {
    const result = reorderElement(
      [element("b", 1), element("a", 1), element("c", 9)],
      "c",
      "BACK",
    );
    expect(
      result
        .sort((left, right) => left.z_index - right.z_index)
        .map(({ id }) => id),
    ).toEqual(["c", "a", "b"]);
  });
});
