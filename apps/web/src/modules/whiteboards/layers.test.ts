import { describe, it, expect } from "vitest";
import { object } from "@/test/board-fixtures";
import { dropLayer, layerNamePatch } from "./layers";
describe("atomic layer manipulation", () => {
  it("adds ordinary objects to an existing Group and extracts to its Section with exact geometry", () => {
    const section = object({ element_type: "SECTION" }),
      group = object({ element_type: "GROUP", parent_id: section.id }),
      existing = object({ parent_id: group.id }),
      loose = object({ x: 123.5, y: 77.25, parent_id: section.id, z_index: 5 });
    const rows = [section, group, existing, loose],
      added = dropLayer(rows, loose.id, group.id, "inside");
    expect(added.find((r) => r.id === loose.id)).toMatchObject({
      id: loose.id,
      parent_id: group.id,
      x: 123.5,
      y: 77.25,
    });
    const out = dropLayer(added, loose.id, group.id, "before");
    expect(out.find((r) => r.id === loose.id)).toMatchObject({
      parent_id: section.id,
      x: 123.5,
      y: 77.25,
    });
    expect(existing.parent_id).toBe(group.id);
    expect(loose.parent_id).toBe(section.id);
    expect(() => dropLayer(rows, group.id, existing.id, "inside")).toThrow(
      /itself/,
    );
    const other = object({ element_type: "GROUP" });
    expect(() =>
      dropLayer([...rows, other], group.id, other.id, "inside"),
    ).toThrow(/Groups cannot/);
  });
  it("reorders a layer above/below a neighbor while retaining world geometry", () => {
    const a = object({ z_index: 1 }),
      b = object({ z_index: 2 }),
      c = object({ z_index: 3 });
    const next = dropLayer([a, b, c], a.id, c.id, "before");
    expect(next.find((r) => r.id === a.id)!.z_index).toBeGreaterThan(
      next.find((r) => r.id === c.id)!.z_index,
    );
    expect(next[0]!.x).toBe(a.x);
    const lower = dropLayer(next, a.id, b.id, "after");
    expect(lower[0]!.z_index).toBeLessThan(lower[1]!.z_index);
  });
  it("moves into/out of a Section with unchanged identity and coordinates", () => {
    const a = object({ x: 123.25, y: -50 }),
      section = object({ element_type: "SECTION", content: { title: "Plan" } });
    const next = dropLayer([a, section], a.id, section.id, "inside");
    expect(next[0]).toMatchObject({
      id: a.id,
      x: 123.25,
      y: -50,
      parent_id: section.id,
    });
    expect(dropLayer(next, a.id, null, "root")[0]!.parent_id).toBeNull();
  });
  it("moves a Group as a unit without detaching its child", () => {
    const section = object({
        element_type: "SECTION",
        content: { title: "Plan" },
      }),
      group = object({ element_type: "GROUP" }),
      child = object({ parent_id: group.id });
    const next = dropLayer(
      [section, group, child],
      group.id,
      section.id,
      "inside",
    );
    expect(next[1]!.parent_id).toBe(section.id);
    expect(next[2]!.parent_id).toBe(group.id);
    expect(next[2]!.x).toBe(child.x);
  });
  it("allows Group extraction but rejects nested Sections, self/cycles and locks without mutating input", () => {
    const group = object({ element_type: "GROUP" }),
      child = object({ parent_id: group.id }),
      section = object({ element_type: "SECTION" }),
      locked = object({ locked: true });
    const rows = [group, child, section, locked];
    expect(
      dropLayer(rows, child.id, null, "root").find((r) => r.id === child.id),
    ).toMatchObject({ parent_id: null, x: child.x, y: child.y });
    expect(() => dropLayer(rows, section.id, group.id, "inside")).toThrow(
      /Sections/,
    );
    expect(() => dropLayer(rows, group.id, child.id, "inside")).toThrow(
      /itself/,
    );
    expect(() => dropLayer(rows, locked.id, null, "root")).toThrow(/Unlock/);
    expect(child.parent_id).toBe(group.id);
  });
  it("bounds a reorder instead of partially saving an oversized span", () => {
    const rows = Array.from({ length: 250 }, (_, i) =>
      object({ z_index: i + 1 }),
    );
    expect(() => dropLayer(rows, rows[0]!.id, rows[248]!.id, "before")).toThrow(
      /200/,
    );
    expect(rows[0]!.z_index).toBe(1);
  });
  it("renames display metadata without overwriting text or image descriptions", () => {
    const a = object({ content: { text: "Actual content" } });
    expect(layerNamePatch(a, "  Display name  ")).toEqual({
      metadata: { label: "Display name" },
    });
    expect(a.content.text).toBe("Actual content");
    expect(() => layerNamePatch(a, "   ")).toThrow();
  });
});
