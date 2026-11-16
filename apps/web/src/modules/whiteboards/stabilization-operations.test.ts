import { describe, it, expect } from "vitest";
import { object } from "@/test/board-fixtures";
import {
  alignObjects,
  distributeObjects,
  visualBounds,
  sectionFromSelection,
  moveObjects,
  matchObjectSize,
} from "./operations";
describe("Board stabilization geometry", () => {
  it.each(["left", "center", "right", "top", "middle", "bottom"] as const)(
    "aligns rotated and differently sized objects by visible %s bounds",
    (direction) => {
      const a = object({ x: 10, y: 20, width: 100, height: 40, rotation: 90 }),
        b = object({ x: 400, y: 250, width: 180, height: 90, rotation: 25 });
      const rows = alignObjects([a, b], [a.id, b.id], direction),
        boxes = rows.map(visualBounds),
        edge = (r: ReturnType<typeof visualBounds>) =>
          direction === "left"
            ? r.x
            : direction === "center"
              ? r.x + r.width / 2
              : direction === "right"
                ? r.x + r.width
                : direction === "top"
                  ? r.y
                  : direction === "middle"
                    ? r.y + r.height / 2
                    : r.y + r.height;
      expect(edge(boxes[0]!)).toBeCloseTo(edge(boxes[1]!));
    },
  );
  it("uses a locked object as an unmoved alignment anchor", () => {
    const a = object({ x: 20, locked: true }),
      b = object({ x: 400 });
    const next = alignObjects([a, b], [a.id, b.id], "left");
    expect(next[0]).toBe(a);
    expect(next[1]!.x).toBe(20);
  });
  it("distributes visible outer edges at equal gaps and retains image aspect", () => {
    const rows = [
      object({ x: 0, width: 80 }),
      object({ x: 170, width: 100, rotation: 30 }),
      object({ x: 600, width: 120 }),
    ];
    const next = distributeObjects(
      rows,
      rows.map((r) => r.id),
      "x",
    ).map(visualBounds);
    expect(next[1]!.x - next[0]!.x - next[0]!.width).toBeCloseTo(
      next[2]!.x - next[1]!.x - next[1]!.width,
    );
    const image = object({ element_type: "IMAGE", width: 100, height: 50 }),
      shape = object({ width: 200 });
    expect(
      matchObjectSize([image, shape], [image.id, shape.id], "width")[0],
    ).toMatchObject({ width: 200, height: 100 });
  });
  it("aligns a Group atomically with its children and Section children in world space", () => {
    const g = object({ element_type: "GROUP", x: 200 }),
      child = object({ parent_id: g.id, x: 230 }),
      s = object({ element_type: "SECTION" }),
      other = object({ parent_id: s.id, x: 50 });
    const next = alignObjects([g, child, s, other], [g.id, other.id], "left");
    expect(next.find((r) => r.id === child.id)!.x).toBe(80);
    expect(next.find((r) => r.id === s.id)).toBe(s);
  });
  it("creates one root Section with padding while preserving existing Groups and coordinates", () => {
    const g = object({ element_type: "GROUP" }),
      child = object({ parent_id: g.id }),
      a = object({ x: 400 });
    const section = object({
      element_type: "SECTION",
      width: 700,
      height: 300,
    });
    const result = sectionFromSelection(
      [g, child, a],
      [g.id, a.id],
      () => section,
    );
    expect(result.rows.find((r) => r.id === g.id)!.parent_id).toBe(section.id);
    expect(result.rows.find((r) => r.id === child.id)!.parent_id).toBe(g.id);
    expect(result.rows.find((r) => r.id === a.id)!.x).toBe(400);
    expect(() =>
      sectionFromSelection(result.rows, [section.id], () => section),
    ).toThrow(/cannot nest/);
  });
  it("moves Section contents once and refuses incompatible distribution", () => {
    const s = object({ element_type: "SECTION" }),
      a = object({ parent_id: s.id }),
      locked = object({ locked: true });
    expect(moveObjects([s, a], [s.id, a.id], 12, 7).map((r) => r.x)).toEqual([
      22, 22,
    ]);
    expect(() =>
      distributeObjects([s, a, locked], [s.id, a.id, locked.id], "x"),
    ).toThrow();
  });
});
