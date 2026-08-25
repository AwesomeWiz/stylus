import { describe, expect, it } from "vitest";

import type { TaskRow } from "@/lib/supabase/database.types";

import { filterTasks, isOverdue, recentCompletionThreshold } from "./filters";

const now = new Date("2026-08-25T12:00:00.000Z");
const currentUserId = "00000000-0000-4000-8000-000000000001";

function task(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    assignee_id: currentUserId,
    completed_at: null,
    created_at: "2026-08-20T10:00:00.000Z",
    created_by: currentUserId,
    description: null,
    due_at: null,
    id: "10000000-0000-4000-8000-000000000001",
    organization_id: "20000000-0000-4000-8000-000000000001",
    priority: "MEDIUM",
    scheduled_at: null,
    status: "TODO",
    title: "Prepare launch notes",
    updated_at: "2026-08-20T10:00:00.000Z",
    updated_by: currentUserId,
    ...overrides,
  };
}

describe("task views and filters", () => {
  it("treats only unfinished work past its deadline as overdue", () => {
    const due = "2026-08-25T11:59:59.999Z";
    expect(isOverdue(task({ due_at: due }), now)).toBe(true);
    expect(
      isOverdue(
        task({ completed_at: due, due_at: due, status: "COMPLETED" }),
        now,
      ),
    ).toBe(false);
    expect(isOverdue(task({ due_at: due, status: "CANCELLED" }), now)).toBe(
      false,
    );
    expect(isOverdue(task({ due_at: now.toISOString() }), now)).toBe(false);
  });

  it("returns only the authenticated user's assignments in My Tasks", () => {
    const other = task({
      assignee_id: "00000000-0000-4000-8000-000000000002",
      id: "10000000-0000-4000-8000-000000000002",
    });
    const completed = task({
      completed_at: "2026-08-25T10:00:00.000Z",
      id: "10000000-0000-4000-8000-000000000003",
      status: "COMPLETED",
    });
    expect(
      filterTasks(
        [task(), other, completed],
        { view: "my" },
        currentUserId,
        now,
      ),
    ).toHaveLength(1);
  });

  it("uses an exact 14-day recent-completion boundary without deleting history", () => {
    const threshold = recentCompletionThreshold(now).toISOString();
    const recent = task({ completed_at: threshold, status: "COMPLETED" });
    const older = task({
      completed_at: "2026-08-11T11:59:59.999Z",
      id: "10000000-0000-4000-8000-000000000002",
      status: "COMPLETED",
    });

    expect(
      filterTasks([recent, older], { view: "completed" }, currentUserId, now),
    ).toEqual([recent]);
    expect(
      filterTasks([recent, older], { view: "archive" }, currentUserId, now),
    ).toEqual([older]);
    expect([recent, older]).toHaveLength(2);
  });

  it("composes title, priority, assignee and status filters", () => {
    const matching = task({
      priority: "URGENT",
      status: "IN_PROGRESS",
      title: "Publish launch brief",
    });
    const result = filterTasks(
      [matching, task({ id: "10000000-0000-4000-8000-000000000002" })],
      {
        assigneeId: currentUserId,
        priority: "URGENT",
        query: "launch BRIEF",
        status: "IN_PROGRESS",
        view: "all",
      },
      currentUserId,
      now,
    );
    expect(result).toEqual([matching]);
  });

  it("orders actionable work deterministically: overdue, due, scheduled, unscheduled", () => {
    const tasks = [
      task({ assignee_id: null, id: "10000000-0000-4000-8000-000000000004" }),
      task({
        due_at: "2026-08-26T12:00:00.000Z",
        id: "10000000-0000-4000-8000-000000000002",
      }),
      task({
        scheduled_at: "2026-08-27T12:00:00.000Z",
        id: "10000000-0000-4000-8000-000000000003",
      }),
      task({ due_at: "2026-08-24T12:00:00.000Z" }),
    ];
    expect(
      filterTasks(tasks, { view: "all" }, currentUserId, now).map(
        ({ id }) => id,
      ),
    ).toEqual([
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
      "10000000-0000-4000-8000-000000000003",
      "10000000-0000-4000-8000-000000000004",
    ]);
  });
});
