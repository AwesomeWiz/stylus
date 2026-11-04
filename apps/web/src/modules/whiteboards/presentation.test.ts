import { describe, it, expect } from "vitest";
import { object } from "@/test/board-fixtures";
import {
  presentationSections,
  startPresentation,
  movePresentation,
  reconcilePresentation,
  presentationTitle,
} from "./presentation";
describe("Section presentation model", () => {
  const a = object({
      element_type: "SECTION",
      z_index: 1,
      content: { title: "One" },
    }),
    b = object({
      element_type: "SECTION",
      z_index: 5,
      content: { title: "Two" },
    }),
    c = object({ element_type: "SECTION", z_index: 3 });
  it("uses top-level active Sections in persisted Layers order without changing rows", () => {
    const archived = object({
        element_type: "SECTION",
        archived_at: "2026-11-04",
      }),
      nested = object({ element_type: "SECTION", parent_id: a.id });
    const rows = [a, b, c, object(), archived, nested];
    expect(presentationSections(rows)).toEqual([b, c, a]);
    expect(rows[0]).toBe(a);
    expect(presentationSections([a, { ...b, z_index: 0 }])).toEqual([
      a,
      { ...b, z_index: 0 },
    ]);
  });
  it("starts at the selected Section, otherwise first; empty cannot start", () => {
    expect(startPresentation([b, c, a], [a.id])?.id).toBe(a.id);
    expect(startPresentation([b, c, a], ["other"])?.id).toBe(b.id);
    expect(startPresentation([], [])).toBeNull();
  });
  it("navigates with bounded endpoints without wrapping", () => {
    const state = startPresentation([b, c, a], [])!;
    expect(movePresentation(state, [b, c, a], -1)).toBe(state);
    const next = movePresentation(state, [b, c, a], 1);
    expect(next.id).toBe(c.id);
    expect(movePresentation(next, [b, c, a], 1).id).toBe(a.id);
    const last = movePresentation(next, [b, c, a], 1);
    expect(movePresentation(last, [b, c, a], 1)).toBe(last);
  });
  it("preserves active identity across remote edits/reorder and chooses nearest after archival", () => {
    const state = startPresentation([b, c, a], [c.id])!;
    expect(reconcilePresentation(state, [b, { ...c, x: 500 }, a])).toBe(state);
    expect(reconcilePresentation(state, [c, a, b])).toMatchObject({
      id: c.id,
      index: 0,
    });
    expect(reconcilePresentation(state, [b, a])).toMatchObject({
      id: a.id,
      index: 1,
      notice: expect.any(String),
    });
    expect(reconcilePresentation(state, [])).toBeNull();
  });
  it("uses current Section title with an unsaved fallback", () => {
    expect(presentationTitle(a)).toBe("One");
    expect(presentationTitle(c)).toBe("Untitled section");
    expect(c.content.title).toBeUndefined();
  });
});
