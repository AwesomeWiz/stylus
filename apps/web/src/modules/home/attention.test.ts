import { describe, expect, it } from "vitest";
import type { TaskListItem } from "@/modules/tasks/list";
import { attentionReason, homeAttention } from "./attention";

const now = new Date("2026-11-01T12:00:00Z");
function task(id: string, fields: Partial<TaskListItem> = {}): TaskListItem {
  return {
    id,
    title: id,
    assignee_id: null,
    due_at: null,
    scheduled_at: null,
    completed_at: null,
    created_at: now.toISOString(),
    priority: "MEDIUM",
    status: "TODO",
    ...fields,
  };
}
describe("Home attention", () => {
  it("ranks overdue, due soon, mine and active; deduplicates and excludes closed work", () => {
    const overdue = task("late", {
      assignee_id: "me",
      due_at: now.toISOString(),
    });
    const soon = task("soon", { due_at: "2026-11-03T12:00:00Z" });
    const mine = task("mine", { assignee_id: "me" });
    const other = task("other");
    expect(
      homeAttention(
        [
          other,
          mine,
          soon,
          overdue,
          overdue,
          task("done", { status: "COMPLETED" }),
          task("cancelled", { status: "CANCELLED" }),
        ],
        "me",
        now,
      ).map((item) => item.id),
    ).toEqual(["late", "soon", "mine", "other"]);
    expect(attentionReason(soon, "me", now)).toBe("Due soon");
  });
  it("bounds attention and resolves identical dates deterministically", () => {
    expect(
      homeAttention(
        Array.from({ length: 10 }, (_, id) => task(String(9 - id))),
        "me",
        now,
      ).map((item) => item.id),
    ).toEqual(["0", "1", "2", "3", "4", "5"]);
    expect(homeAttention([], "me", now)).toEqual([]);
  });
});
