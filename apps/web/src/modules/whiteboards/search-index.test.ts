import { describe, expect, it } from "vitest";
import { object } from "@/test/board-fixtures";
import { updateBoardSearchIndex } from "./search-index";
describe("incremental Board search projections", () => {
  it("reuses searchable entries across geometry, audit and appearance changes", () => {
    const a = object({ content: { text: "Launch finding" } }),
      b = object();
    const index = updateBoardSearchIndex([], [a, b]);
    expect(
      updateBoardSearchIndex(index, [
        {
          ...a,
          x: 500,
          style: { fontSize: 24 },
          content: { ...a.content },
          updated_at: "2026-11-04T00:00:00Z",
        },
        b,
      ]),
    ).toBe(index);
  });
  it("updates renamed/content records, removes archived projections and preserves the rest", () => {
    const a = object({ content: { text: "Old finding" } }),
      b = object({ content: { text: "Stable" } }),
      c = object();
    const index = updateBoardSearchIndex([], [a, b, c]);
    const next = updateBoardSearchIndex(index, [
      {
        ...a,
        metadata: { label: "New name" },
        content: {
          text: "Changed finding",
          note: "Evidence",
          alt: "Reference",
        },
      },
      b,
    ]);
    expect(next[0]!.normalized).toBe(
      "new name changed finding evidence reference",
    );
    expect(next[1]).toBe(index[1]);
    expect(next).toHaveLength(2);
    expect(index[0]!.normalized).toContain("old finding");
    expect(updateBoardSearchIndex([], [b])[0]).not.toBe(index[1]);
  });
});
