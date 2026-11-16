import { describe, it, expect } from "vitest";
import { object } from "@/test/board-fixtures";
import { buildGuideIndex, guideMove } from "./guides";
describe("bounded guide geometry", () => {
  const bounds = { x: 0, y: 0, width: 100, height: 100 };
  it("snaps nearby left/center/right and top/middle/bottom edges at screen-space tolerance", () => {
    const target = object({ x: 300, y: 200, width: 100, height: 100 }),
      index = buildGuideIndex([target], new Set(), bounds);
    const result = guideMove(index, bounds, 297, 198);
    expect(result.dx).toBe(300);
    expect(result.dy).toBe(200);
    expect(result.guides).toHaveLength(2);
    expect(guideMove(index, bounds, 293, 190, { zoom: 2 }).dx).toBe(293);
  });
  it("keeps snapping independent from grid visibility, supports disabled snap and temporary bypass", () => {
    const index = buildGuideIndex(
      [object({ x: 300, y: 200, width: 100, height: 100 })],
      new Set(),
      bounds,
    );
    expect(guideMove(index, bounds, 297, 198, { snap: false }).dx).toBe(297);
    expect(
      guideMove(index, bounds, 297, 198, { bypass: true, grid: true }).guides,
    ).toEqual([]);
    expect(
      guideMove(index, bounds, 31, 31, { snap: false, grid: true }).dx,
    ).toBe(24);
  });
  it("indexes only the nearest 128 targets and excludes the moving set", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => object({ x: i * 200 }));
    const index = buildGuideIndex(rows, new Set([rows[0]!.id]), bounds);
    expect(index.boxes).toHaveLength(128);
    expect(index.boxes.some((box) => box.x === 0)).toBe(false);
  });
  it("shows equal-spacing hints without an automatic layout operation", () => {
    const rows = [
        object({ x: 0, y: 0, width: 100, height: 100 }),
        object({ x: 300, y: 0, width: 100, height: 100 }),
      ],
      box = { x: 150, y: 0, width: 100, height: 100 };
    expect(
      guideMove(buildGuideIndex(rows, new Set(), box), box, 0, 0).spacing?.gap,
    ).toBe(50);
  });
});
