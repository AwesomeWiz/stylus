import { describe, it, expect } from "vitest";
import { object } from "@/test/board-fixtures";
import { indexBoardObjects } from "./operations";
import {
  selectedGroupContext,
  canvasSelectionTarget,
} from "./canvas-selection";
describe("canvas Group context", () => {
  it("selects a Group first and resolves compatible children only after drill-in", () => {
    const group = object({ element_type: "GROUP" }),
      a = object({ parent_id: group.id }),
      b = object({ parent_id: group.id }),
      loose = object(),
      index = indexBoardObjects([group, a, b, loose]);
    expect(canvasSelectionTarget(index, [], a.id, false)).toEqual({
      id: group.id,
      additive: false,
    });
    expect(selectedGroupContext(index, [a.id])).toBe(group.id);
    expect(canvasSelectionTarget(index, [a.id], b.id, true)).toEqual({
      id: b.id,
      additive: true,
    });
    expect(selectedGroupContext(index, [a.id, b.id])).toBe(group.id);
    expect(canvasSelectionTarget(index, [a.id], loose.id, true)).toEqual({
      id: loose.id,
      additive: false,
    });
  });
  it("exits predictably to another Group instead of extending mixed child selection", () => {
    const g1 = object({ element_type: "GROUP" }),
      g2 = object({ element_type: "GROUP" }),
      a = object({ parent_id: g1.id }),
      b = object({ parent_id: g2.id }),
      index = indexBoardObjects([g1, g2, a, b]);
    expect(canvasSelectionTarget(index, [a.id], b.id, true)).toEqual({
      id: g2.id,
      additive: false,
    });
    expect(selectedGroupContext(index, [a.id, b.id])).toBeNull();
    expect(selectedGroupContext(index, [g1.id])).toBeNull();
  });
});
