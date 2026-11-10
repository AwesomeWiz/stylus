import { describe, it, expect } from "vitest";
import { executionMutation, executionSearch } from "./schemas";
const id = crypto.randomUUID();
describe("Core execution bounded inputs", () => {
  it("permits only typed canonical relations, never client authority or private kinds", () => {
    expect(
      executionMutation.safeParse({
        operation: "dependency",
        taskId: id,
        blockedById: crypto.randomUUID(),
        link: true,
      }).success,
    ).toBe(true);
    for (const patch of [
      { organizationId: crypto.randomUUID() },
      { actorId: crypto.randomUUID() },
      { role: "OWNER" },
    ])
      expect(
        executionMutation.safeParse({
          operation: "assignment",
          taskId: id,
          milestoneId: null,
          ...patch,
        }).success,
      ).toBe(false);
    expect(
      executionMutation.safeParse({
        operation: "note-link",
        noteId: id,
        kind: "marketing-private",
        targetId: id,
        link: true,
      }).success,
    ).toBe(false);
  });
  it("bounds Notes and separately requires reviewed Memory text", () => {
    const note = {
      operation: "note",
      id,
      title: "Plan",
      content: "x".repeat(40000),
      archived: false,
      revision: null,
    };
    expect(executionMutation.safeParse(note).success).toBe(true);
    expect(
      executionMutation.safeParse({ ...note, content: note.content + "x" })
        .success,
    ).toBe(false);
    expect(
      executionMutation.safeParse({
        operation: "note-memory",
        noteId: id,
        revision: "2026-11-10T12:00:00.123456Z",
        title: "Reviewed",
        kind: "NOTE",
        content: "x".repeat(10001),
      }).success,
    ).toBe(false);
  });
  it("bounds explicit domain search and cursors", () => {
    expect(
      executionSearch.safeParse({ kind: "task", query: "planned" }).success,
    ).toBe(true);
    expect(
      executionSearch.safeParse({ kind: "milestone", query: "x".repeat(101) })
        .success,
    ).toBe(false);
    expect(
      executionSearch.safeParse({ kind: "task", query: "", cursor: "forged" })
        .success,
    ).toBe(false);
  });
});
