import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskMember, TaskRow } from "@/lib/supabase/database.types";

vi.mock("@/modules/tasks/actions", () => ({
  addTaskCommentAction: vi.fn(),
  createTaskAction: vi.fn(),
  setTaskCompletionAction: vi.fn(),
  updateTaskAction: vi.fn(),
}));
const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  detail: vi.fn(),
  comments: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }),
}));
vi.mock("@/modules/tasks/read-actions", () => ({
  loadTaskDetail: mocks.detail,
  loadTaskComments: mocks.comments,
}));
import { TaskWorkspace } from "./task-workspace";
import { selectTaskQuery } from "./task-selection";
import { addTaskCommentAction } from "@/modules/tasks/actions";

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
let desktop = true;
function renderWorkspace(
  canMutate = true,
  tasks: TaskRow[] = [task],
  query = "view=my",
  nextDeadlineIso: string | null = null,
) {
  window.history.replaceState(null, "", `/tasks?${query}`);
  return render(
    <TaskWorkspace
      canMutate={canMutate}
      currentUserId={members[0]!.member_user_id}
      filters={{ view: "my" }}
      initialQuery={query}
      members={members}
      nextDeadlineIso={nextDeadlineIso}
      nowIso="2026-08-25T12:00:00.000Z"
      organizationId={task.organization_id}
      tasks={tasks}
    />,
  );
}
describe("task workspace", () => {
  beforeEach(() => {
    desktop = true;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: desktop,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    mocks.detail.mockResolvedValue({
      status: "success",
      task,
      canMutate: false,
    });
    mocks.comments.mockResolvedValue({
      status: "success",
      comments: [],
      before: null,
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  });

  it("renders an actionable row with textual status, priority and accessible completion", () => {
    renderWorkspace();
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Complete Prepare launch notes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("High priority")).toBeInTheDocument();
    expect(mocks.detail).not.toHaveBeenCalled();
    expect(mocks.comments).not.toHaveBeenCalled();
  });
  it("offers the shared creation dialog to collaborators", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(
      screen.getByRole("dialog", { name: "Create task" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeRequired();
    expect(window.location.search).toContain("create=true");
  });
  it("opens creation from the Home URL and removes only create on close", () => {
    renderWorkspace(true, [task], "view=all&query=launch&create=true");
    expect(
      screen.getByRole("dialog", { name: "Create task" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(window.location.search).toBe("?view=all&query=launch");
  });
  it("keeps VIEWER read-only while lazily loading authorized detail and discussion", async () => {
    renderWorkspace(false);
    expect(
      screen.queryByRole("button", { name: "Create task" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Complete Prepare launch notes" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(task.title).closest("button")!);
    expect(
      await screen.findByRole("dialog", { name: task.title }),
    ).toHaveAttribute("aria-modal", "false");
    expect(screen.getByText(task.description!)).toBeInTheDocument();
    await screen.findByText("No comments yet.");
    expect(screen.queryByLabelText("Add context")).not.toBeInTheDocument();
    expect(mocks.detail).toHaveBeenCalledWith({
      organizationId: task.organization_id,
      taskId: task.id,
    });
    expect(mocks.comments).toHaveBeenCalledTimes(1);
  });
  it("shows a view-specific empty state", () => {
    renderWorkspace(true, []);
    expect(screen.getByText("No tasks assigned to you.")).toBeInTheDocument();
  });
  it("refreshes once when the nearest active deadline is crossed", () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-25T12:00:00.000Z");
    renderWorkspace(true, [], "view=overdue", "2026-08-25T12:04:00.000Z");
    vi.advanceTimersByTime(4 * 60 * 1000 - 1);
    expect(mocks.refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
  it("opens direct authorized selection outside the visible list", async () => {
    renderWorkspace(false, [], `view=completed&task=${task.id}`);
    expect(screen.getByText("Loading task details…")).toBeInTheDocument();
    expect(
      await screen.findByRole("dialog", { name: task.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(task.description!)).toBeInTheDocument();
  });
  it("closes selection without losing filters and restores row focus", async () => {
    renderWorkspace(
      true,
      [task],
      `view=all&query=launch&priority=HIGH&task=${task.id}`,
    );
    await screen.findByRole("dialog", { name: task.title });
    fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
    expect(window.location.search).toBe("?view=all&query=launch&priority=HIGH");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("data-task-open", task.id),
    );
  });
  it("reacts to Back/Forward selection changes", async () => {
    renderWorkspace();
    fireEvent.click(screen.getByText(task.title).closest("button")!);
    await screen.findByRole("dialog", { name: task.title });
    act(() => {
      window.history.replaceState(null, "", "/tasks?view=my");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("data-task-open", task.id),
    );
    act(() => {
      window.history.replaceState(null, "", `/tasks?view=my&task=${task.id}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(
      await screen.findByRole("dialog", { name: task.title }),
    ).toBeInTheDocument();
  });
  it("uses a modal detail on mobile/tablet", async () => {
    desktop = false;
    renderWorkspace(false, [], `task=${task.id}`);
    expect(
      await screen.findByRole("dialog", { name: task.title }),
    ).toHaveAttribute("aria-modal", "true");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
  it("keeps primary views visible and secondary views discoverable", () => {
    renderWorkspace(true, [task], "view=my&priority=HIGH");
    const nav = screen.getByRole("navigation", { name: "Task views" });
    for (const label of ["My tasks", "All tasks", "Upcoming", "Completed"])
      expect(within(nav).getByRole("link", { name: label })).toBeVisible();
    expect(
      screen.getByText("More views").closest("details"),
    ).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("More views"));
    expect(within(nav).getByRole("link", { name: "Archive" })).toHaveAttribute(
      "href",
      "/tasks?view=archive&priority=HIGH",
    );
  });
  it("keeps discussion errors local with retry and preserves task details", async () => {
    mocks.comments.mockResolvedValueOnce({ status: "error" });
    renderWorkspace(false, [], `task=${task.id}`);
    await screen.findByText("Comments could not be loaded.");
    expect(screen.getByText(task.description!)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry comments" }));
    await screen.findByText("No comments yet.");
  });

  it("refreshes after repeated comment posts without remounting the focused composer", async () => {
    vi.mocked(addTaskCommentAction).mockImplementation(async () => ({
      status: "success",
    }));
    mocks.detail.mockResolvedValue({
      status: "success",
      task,
      canMutate: true,
    });
    renderWorkspace(true, [], `task=${task.id}`);
    const input = await screen.findByLabelText("Add context");
    input.focus();
    for (const body of ["First observation", "Second observation"]) {
      const before = mocks.comments.mock.calls.length;
      fireEvent.change(input, { target: { value: body } });
      fireEvent.submit(input.closest("form")!);
      await waitFor(() =>
        expect(mocks.comments).toHaveBeenCalledTimes(before + 1),
      );
      await waitFor(() => expect(input).toHaveValue(""));
      expect(screen.getByLabelText("Add context")).toBe(input);
      expect(input).toHaveFocus();
    }
  });
  it("shows safe unavailable and retryable detail errors", async () => {
    mocks.detail.mockResolvedValueOnce({ status: "unavailable" });
    renderWorkspace(false, [], `task=${task.id}`);
    await screen.findByText(
      "This task is unavailable or you no longer have access.",
    );
    expect(mocks.comments).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry details" }));
    await screen.findByRole("dialog", { name: task.title });
  });
  it("ignores late task A detail after selecting B or closing", async () => {
    let finish!: (value: unknown) => void;
    mocks.detail.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const other = {
      ...task,
      id: "10000000-0000-4000-8000-000000000002",
      title: "Second task",
    };
    mocks.detail.mockResolvedValueOnce({
      status: "success",
      task: other,
      canMutate: false,
    });
    renderWorkspace(false, [task, other], `task=${task.id}`);
    act(() => selectTaskQuery({ task: other.id }));
    await screen.findByRole("dialog", { name: other.title });
    await act(async () => {
      finish({ status: "success", task, canMutate: true });
    });
    expect(
      screen.getByRole("dialog", { name: other.title }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("ignores late task A discussion after switching to B", async () => {
    let finish!: (value: unknown) => void;
    mocks.comments.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderWorkspace(false, [], `task=${task.id}`);
    await screen.findByText("Loading discussion…");
    act(() => selectTaskQuery({ task: "another-id" }));
    await screen.findByText("No comments yet.");
    await act(async () => {
      finish({
        status: "success",
        comments: [
          { id: "secret", task_id: task.id, body: "Old task discussion" },
        ],
        before: null,
      });
    });
    expect(screen.queryByText("Old task discussion")).not.toBeInTheDocument();
  });

  it("never reopens a closed panel when a pending response arrives", async () => {
    let finish!: (value: unknown) => void;
    mocks.detail.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderWorkspace(false, [], `task=${task.id}`);
    fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
    await act(async () => {
      finish({ status: "success", task, canMutate: false });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.comments).not.toHaveBeenCalled();
  });

  it("discloses filters and preserves search, view and selection when applying", () => {
    renderWorkspace(true, [task], "view=my&query=launch&task=pending");
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.change(screen.getByLabelText("Assignee"), {
      target: { value: "unassigned" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(mocks.push).toHaveBeenCalledWith(
      "/tasks?view=my&query=launch&task=pending&assignee=unassigned",
      { scroll: false },
    );
  });

  it("distinguishes no filter matches and removes one active filter without losing context", () => {
    const query =
      "view=all&query=launch&assignee=unassigned&priority=HIGH&task=pending";
    window.history.replaceState(null, "", `/tasks?${query}`);
    render(
      <TaskWorkspace
        canMutate={false}
        currentUserId={members[0]!.member_user_id}
        filters={{
          view: "all",
          query: "launch",
          assigneeId: "unassigned",
          priority: "HIGH",
        }}
        initialQuery={query}
        members={members}
        nextDeadlineIso={null}
        nowIso="2026-08-25T12:00:00Z"
        organizationId={task.organization_id}
        tasks={[]}
      />,
    );
    expect(screen.getByText("No matching tasks.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Remove High priority filter" }),
    ).toHaveAttribute(
      "href",
      "/tasks?view=all&query=launch&assignee=unassigned&task=pending",
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mocks.push).toHaveBeenCalledWith("/tasks?view=all&task=pending", {
      scroll: false,
    });
  });
});
