import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TaskMember, TaskRow } from "@/lib/supabase/database.types";

vi.mock("@/modules/tasks/actions", () => ({
  addTaskCommentAction: vi.fn(),
  createTaskAction: vi.fn(),
  setTaskCompletionAction: vi.fn(),
  updateTaskAction: vi.fn(),
}));

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

import { TaskWorkspace } from "./task-workspace";
import { formatTaskDate } from "./presentation";

const members: TaskMember[] = [
  {
    display_name: "Alex Morgan",
    member_user_id: "00000000-0000-4000-8000-000000000001",
    role: "MEMBER",
  },
];

const task: TaskRow = {
  assignee_id: members[0]!.member_user_id,
  completed_at: null,
  created_at: "2026-08-20T10:00:00.000Z",
  created_by: members[0]!.member_user_id,
  description: "Prepare the final launch context.",
  due_at: "2026-08-24T12:00:00.000Z",
  id: "10000000-0000-4000-8000-000000000001",
  organization_id: "20000000-0000-4000-8000-000000000001",
  priority: "HIGH",
  scheduled_at: null,
  status: "TODO",
  title: "Prepare launch notes",
  updated_at: "2026-08-20T10:00:00.000Z",
  updated_by: members[0]!.member_user_id,
};

function renderWorkspace(
  canMutate: boolean,
  tasks: TaskRow[] = [task],
  nextDeadlineIso: string | null = null,
  selectedTaskId?: string,
) {
  return render(
    <TaskWorkspace
      canMutate={canMutate}
      comments={[]}
      currentUserId={members[0]!.member_user_id}
      filters={{ view: "my" }}
      members={members}
      nextDeadlineIso={nextDeadlineIso}
      nowIso="2026-08-25T12:00:00.000Z"
      selectedTaskId={selectedTaskId}
      tasks={tasks}
    />,
  );
}

describe("task workspace", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders a compact actionable row with an accessible completion control", () => {
    renderWorkspace(true);
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Complete Prepare launch notes" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Alex Morgan").length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatTaskDate(task.due_at!))).toHaveLength(2);
  });

  it("offers an accessible creation dialog to collaborators", () => {
    renderWorkspace(true);
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(
      screen.getByRole("dialog", { name: "Create task" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeRequired();
    expect(screen.getByLabelText(/Assignee/)).toBeInTheDocument();
  });

  it("keeps VIEWER controls read-only while retaining task detail visibility", () => {
    renderWorkspace(false);
    expect(
      screen.queryByRole("button", { name: "Create task" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Complete Prepare launch notes" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByText("Prepare launch notes").closest("button")!,
    );
    expect(
      screen.getByRole("dialog", { name: "Prepare launch notes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Prepare the final launch context."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Add context")).not.toBeInTheDocument();
  });

  it("shows view-specific empty states", () => {
    renderWorkspace(true, []);
    expect(screen.getByText("No tasks assigned to you.")).toBeInTheDocument();
  });

  it("refreshes once when the nearest active deadline is crossed", () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-25T12:00:00.000Z");
    renderWorkspace(true, [], "2026-08-25T12:04:00.000Z");

    vi.advanceTimersByTime(4 * 60 * 1000 - 1);
    expect(router.refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("opens a safely selected task context from internal navigation", () => {
    renderWorkspace(true, [task], null, task.id);
    expect(
      screen.getByRole("dialog", { name: "Prepare launch notes" }),
    ).toBeInTheDocument();
  });
});
