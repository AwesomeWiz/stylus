import { describe, expect, it } from "vitest";
import { object } from "@/test/board-fixtures";
import { indexBoardLayers, visibleBoardLayers } from "./layers";
describe("canonical Layer structure projection", () => {
  it("retains ordering through geometry/name changes and indexes supported Section/Group depth", () => {
    const section = object({ element_type: "SECTION", z_index: 1 }),
      group = object({
        element_type: "GROUP",
        parent_id: section.id,
        z_index: 2,
      }),
      child = object({ parent_id: group.id, z_index: 3 }),
      loose = object({ z_index: 4 }),
      rows = [section, group, child, loose];
    const index = indexBoardLayers(undefined, rows);
    expect(visibleBoardLayers(index, new Set())).toEqual([
      { id: loose.id, depth: 0 },
      { id: section.id, depth: 0 },
      { id: group.id, depth: 1 },
      { id: child.id, depth: 2 },
    ]);
    expect(
      indexBoardLayers(
        index,
        rows.map((row) => ({
          ...row,
          x: row.x + 10,
          metadata: { label: "Renamed" },
        })),
      ),
    ).toBe(index);
    expect(visibleBoardLayers(index, new Set([group.id]))).toHaveLength(3);
    expect(visibleBoardLayers(index, new Set([section.id]))).toHaveLength(2);
  });
  it("invalidates structural changes, removals and sibling reorder without retaining stale membership", () => {
    const section = object({ element_type: "SECTION" }),
      a = object({ parent_id: section.id, z_index: 2 }),
      b = object({ parent_id: section.id, z_index: 3 });
    const index = indexBoardLayers(undefined, [section, a, b]);
    const moved = indexBoardLayers(index, [
      section,
      { ...a, parent_id: null, z_index: 4 },
    ]);
    expect(moved).not.toBe(index);
    expect(moved.children.get(section.id)).toBeUndefined();
    expect(visibleBoardLayers(moved, new Set()).map((row) => row.id)).toEqual([
      a.id,
      section.id,
    ]);
    expect(index.children.get(section.id)).toEqual([b.id, a.id]);
  });
});
