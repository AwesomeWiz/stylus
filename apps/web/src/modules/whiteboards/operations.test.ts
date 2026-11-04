import { describe, expect, it } from "vitest";
import { board, object } from "@/test/board-fixtures";
import {
  alignObjects,
  archiveObjects,
  assignSection,
  distributeObjects,
  duplicateObjects,
  groupObjects,
  indexBoardObjects,
  isObjectLocked,
  layerObjects,
  matchObjectSize,
  moveObjects,
  operationPayload,
  ungroupObjects,
} from "./operations";
import { boardOperationSchema } from "./schemas";
import { boardTemplates, initializeTemplate } from "./templates";

describe("Board V2 operations", () => {
  it("projects negative persisted layers to valid integer CSS order behind owned children", () => {
    const section = object({ element_type: "SECTION", z_index: 30 });
    const group = object({
      element_type: "GROUP",
      parent_id: section.id,
      z_index: 20,
    });
    const child = object({ parent_id: group.id, z_index: -333336 });
    const top = object({ parent_id: group.id, z_index: -333335 });
    const outside = object({ z_index: 50 });
    const rows = [section, group, child, top, outside];
    const { layers } = indexBoardObjects(rows);
    expect(
      [...layers.values()].every((z) => Number.isInteger(z) && z > 0),
    ).toBe(true);
    expect(layers.get(section.id)).toBeLessThan(layers.get(group.id)!);
    expect(layers.get(group.id)).toBeLessThan(layers.get(child.id)!);
    expect(layers.get(child.id)).toBeLessThan(layers.get(top.id)!);
    expect(layers.get(top.id)).toBeLessThan(layers.get(outside.id)!);
    expect(child.z_index).toBe(-333336);
    expect(group.z_index).toBe(20);
  });
  it("moves a Section, its Group and nested children exactly once", () => {
    const section = object({
        element_type: "SECTION",
        content: { title: "Direction" },
      }),
      group = object({ element_type: "GROUP", parent_id: section.id }),
      child = object({ parent_id: group.id });
    const result = moveObjects(
      [section, group, child],
      [section.id, child.id],
      15,
      -5,
    );
    expect(result.map((row) => [row.x, row.y])).toEqual([
      [25, 15],
      [25, 15],
      [25, 15],
    ]);
    expect(
      operationPayload(board.id, [section, group, child], result).upserts,
    ).toHaveLength(3);
  });
  it("excludes locked objects from movement and inherits container locks", () => {
    const section = object({ element_type: "SECTION", locked: true }),
      child = object({ parent_id: section.id }),
      free = object();
    expect(isObjectLocked(child, [section, child])).toBe(true);
    expect(
      moveObjects([section, child, free], [section.id, free.id], 10, 0).map(
        (row) => row.x,
      ),
    ).toEqual([10, 10, 20]);
    expect(() => moveObjects([section, child], [section.id], 10, 0)).toThrow(
      /Unlock/,
    );
  });
  it("groups without changing world coordinates and ungroups back to the Section", () => {
    const section = object({ element_type: "SECTION" }),
      a = object({ parent_id: section.id }),
      b = object({ parent_id: section.id, x: 400 });
    const group = object({ element_type: "GROUP", parent_id: section.id });
    const grouped = groupObjects([section, a, b], [a.id, b.id], () => group);
    expect(grouped.find((row) => row.id === a.id)).toMatchObject({
      parent_id: group.id,
      x: 10,
      y: 20,
    });
    expect(ungroupObjects(grouped, [group.id])).toEqual([section, a, b]);
  });
  it("rejects nested or mixed-parent groups", () => {
    const group = object({ element_type: "GROUP" }),
      a = object({ parent_id: group.id }),
      b = object();
    expect(() =>
      groupObjects([group, a, b], [a.id, b.id], () => group),
    ).toThrow(/same Section/);
    expect(() =>
      groupObjects([group, a, b], [group.id, b.id], () => group),
    ).toThrow(/ungroup/);
  });
  it("membership is explicit and never based on overlap", () => {
    const section = object({ element_type: "SECTION" }),
      a = object();
    expect(moveObjects([section, a], [a.id], 1, 1)[1]!.parent_id).toBeNull();
    expect(assignSection([section, a], [a.id], section.id)[1]!.parent_id).toBe(
      section.id,
    );
    expect(() => assignSection([section, a], [section.id], section.id)).toThrow(
      /cannot nest/,
    );
  });
  it("offers keeping Section children or archiving the whole ownership tree", () => {
    const section = object({ element_type: "SECTION" }),
      group = object({ element_type: "GROUP", parent_id: section.id }),
      child = object({ parent_id: group.id });
    expect(archiveObjects([section, group, child], [section.id], true)).toEqual(
      [{ ...group, parent_id: null }, child],
    );
    expect(archiveObjects([section, group, child], [section.id])).toEqual([]);
  });
  it("duplicates container identities and links while retaining the original private image", () => {
    const section = object({
        element_type: "SECTION",
        content: { title: "Sources" },
      }),
      image = object({
        element_type: "IMAGE",
        parent_id: section.id,
        metadata: { storagePath: "private/original.png" },
      });
    const result = duplicateObjects(
        [section, image],
        [section.id],
        board.created_by,
      ),
      copies = result.rows.slice(2);
    expect(copies[0]!.id).not.toBe(section.id);
    expect(copies[1]!.parent_id).toBe(copies[0]!.id);
    expect(copies[1]!.metadata).toEqual(image.metadata);
    expect(copies[1]!.x).toBe(image.x + 24);
  });
  it("aligns to selection bounds and spaces unequal outer edges evenly", () => {
    const a = object({ x: 0, width: 100 }),
      b = object({ x: 200, width: 200 }),
      c = object({ x: 800, width: 100 }),
      rows = [a, b, c],
      ids = rows.map((row) => row.id);
    expect(alignObjects(rows, ids, "right").map((row) => row.x)).toEqual([
      800, 700, 800,
    ]);
    expect(distributeObjects(rows, ids, "x").map((row) => row.x)).toEqual([
      0, 350, 800,
    ]);
    expect(() => distributeObjects(rows, ids.slice(0, 2), "x")).toThrow(
      /three/,
    );
  });
  it("matches image size with aspect lock and keeps Circles circular", () => {
    const image = object({ element_type: "IMAGE", width: 100, height: 50 }),
      circle = object({
        element_type: "SHAPE",
        content: { shape: "circle" },
        width: 200,
        height: 200,
      });
    expect(
      matchObjectSize([image, circle], [image.id, circle.id], "width")[0],
    ).toMatchObject({ width: 200, height: 100 });
    expect(
      matchObjectSize([image, circle], [image.id, circle.id], "height")[1],
    ).toMatchObject({ width: 200, height: 200 });
  });
  it("persists all four layer actions without changing the other object identities", () => {
    const a = object({ z_index: 1 }),
      b = object({ z_index: 2 }),
      c = object({ z_index: 3 }),
      rows = [a, b, c];
    expect(
      layerObjects(rows, [a.id], "FORWARD").map((row) => row.z_index),
    ).toEqual([2, 1, 3]);
    expect(
      layerObjects(rows, [c.id], "BACKWARD").map((row) => row.z_index),
    ).toEqual([1, 3, 2]);
    expect(layerObjects(rows, [a.id], "FRONT")[0]!.z_index).toBeGreaterThan(3);
    expect(layerObjects(rows, [c.id], "BACK")[2]!.z_index).toBeLessThan(1);
  });
  it("rejects unsafe links, invalid crops and oversized atomic operations", () => {
    const row = object({
      element_type: "LINK",
      content: { title: "Source", url: "javascript:alert(1)" },
    });
    expect(
      boardOperationSchema.safeParse(operationPayload(board.id, [], [row]))
        .success,
    ).toBe(false);
    expect(
      boardOperationSchema.safeParse(
        operationPayload(board.id, [], [object({ style: { cropZoom: 10 } })]),
      ).success,
    ).toBe(false);
    expect(() =>
      operationPayload(
        board.id,
        [],
        Array.from({ length: 201 }, () => object()),
      ),
    ).toThrow(/200/);
  });
  it("initializes all seven templates with native, valid, explicitly owned objects only", () => {
    expect(boardTemplates).toHaveLength(7);
    for (const template of boardTemplates) {
      const rows = initializeTemplate(
        template.key,
        board.id,
        board.organization_id,
        board.created_by,
      );
      if (template.key === "blank") expect(rows).toEqual([]);
      else {
        expect(rows.some((row) => row.element_type === "SECTION")).toBe(true);
        expect(
          boardOperationSchema.safeParse(operationPayload(board.id, [], rows))
            .success,
        ).toBe(true);
        expect(
          rows.every((row) => ["SECTION", "STICKY"].includes(row.element_type)),
        ).toBe(true);
      }
    }
  });
});
