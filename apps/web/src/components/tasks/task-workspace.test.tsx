import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TaskMember, TaskRow } from "@/lib/supabase/database.types";

vi.mock("@/modules/tasks/actions", () => ({
  addTaskCommentAction: vi.fn(),
  createTaskAction: vi.fn(),
  setTaskCompletionAction: vi.fn(),
  updateTaskAction: vi.fn(),
}));

import { TaskWorkspace } from "./task-workspace";

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

function renderWorkspace(canMutate: boolean, tasks: TaskRow[] = [task]) {
  return render(
    <TaskWorkspace
      canMutate={canMutate}
      comments={[]}
      currentUserId={members[0]!.member_user_id}
      filters={{ view: "my" }}
      members={members}
      nowIso="2026-08-25T12:00:00.000Z"
      tasks={tasks}
    />,
  );
}

describe("task workspace", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a compact actionable row with an accessible completion control", () => {
    renderWorkspace(true);
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Complete Prepare launch notes" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Alex Morgan").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Aug 24, 12:00 PM UTC/i)).toHaveLength(2);
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
});
