import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  getContext: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  update: vi.fn(),
  unstableRethrow: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  unstable_rethrow: mocks.unstableRethrow,
}));

import {
  addTaskCommentAction,
  createTaskAction,
  setTaskCompletionAction,
  updateTaskAction,
} from "./actions";
import { initialTaskActionState } from "./schemas";

const organizationId = "10000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000001";
const assigneeId = "00000000-0000-4000-8000-000000000002";
const taskId = "20000000-0000-4000-8000-000000000001";

function validForm() {
  const form = new FormData();
  form.set("title", "Prepare launch notes");
  form.set("description", "Give the team enough launch context.");
  form.set("assigneeId", assigneeId);
  form.set("priority", "HIGH");
  form.set("scheduledAt", "2026-08-25T12:00:00.000Z");
  form.set("dueAt", "2026-08-26T12:00:00.000Z");
  return form;
}

describe("task actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mutationQuery = {
      eq: vi.fn(() => mutationQuery),
      maybeSingle: mocks.maybeSingle,
      select: vi.fn(() => mutationQuery),
    };
    mocks.insert.mockResolvedValue({ error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { id: taskId }, error: null });
    mocks.update.mockReturnValue(mutationQuery);
    mocks.from.mockReturnValue({ insert: mocks.insert, update: mocks.update });
    mocks.rpc.mockResolvedValue({
      data: [
        { display_name: "Sam", member_user_id: assigneeId, role: "MEMBER" },
      ],
      error: null,
    });
    mocks.createClient.mockResolvedValue({ from: mocks.from, rpc: mocks.rpc });
    mocks.getContext.mockResolvedValue({
      membership: { role: "MEMBER" },
      organization: { id: organizationId },
      user: { id: userId },
    });
    mocks.redirect.mockImplementation((path) => {
      throw new Error(`redirect:${path}`);
    });
    mocks.unstableRethrow.mockImplementation((error) => {
      if (error instanceof Error && error.message.startsWith("redirect:"))
        throw error;
    });
  });

  it("lets a MEMBER create a task using only server-derived organization and creator fields", async () => {
    const form = validForm();
    form.set("organizationId", "90000000-0000-4000-8000-000000000009");
    form.set("createdBy", assigneeId);

    await expect(
      createTaskAction(initialTaskActionState, form),
    ).resolves.toEqual({
      status: "success",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("list_organization_task_members", {
      p_organization_id: organizationId,
    });
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        assignee_id: assigneeId,
        created_by: userId,
        organization_id: organizationId,
        updated_by: userId,
      }),
    );
    expect(mocks.insert.mock.calls[0]?.[0]).not.toHaveProperty("status");
  });

  it("supports unassigned tasks without accepting an arbitrary user", async () => {
    const form = validForm();
    form.set("assigneeId", "");

    await createTaskAction(initialTaskActionState, form);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ assignee_id: null }),
    );
  });

  it("rejects an assignee outside the current organization", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    const result = await createTaskAction(initialTaskActionState, validForm());
    expect(result).toMatchObject({ status: "error" });
    expect(result.message).toContain("assignee");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("keeps VIEWER read-only", async () => {
    mocks.getContext.mockResolvedValue({
      membership: { role: "VIEWER" },
      organization: { id: organizationId },
      user: { id: userId },
    });

    await expect(
      createTaskAction(initialTaskActionState, validForm()),
    ).resolves.toMatchObject({
      status: "error",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("preserves the organization-setup redirect when membership is unavailable", async () => {
    mocks.getContext.mockResolvedValue(null);

    await expect(
      createTaskAction(initialTaskActionState, validForm()),
    ).rejects.toThrow("redirect:/organization/new");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects invalid dates before identity or persistence", async () => {
    const form = validForm();
    form.set("dueAt", "not-a-date");

    await expect(
      createTaskAction(initialTaskActionState, form),
    ).resolves.toMatchObject({
      status: "error",
    });
    expect(mocks.getContext).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("scopes edits to the current organization and does not mass-assign provenance", async () => {
    const form = validForm();
    form.set("taskId", taskId);
    form.set("status", "IN_PROGRESS");
    form.set("organizationId", "90000000-0000-4000-8000-000000000009");

    await updateTaskAction(initialTaskActionState, form);
    const query = mocks.update.mock.results[0]?.value;
    expect(query.eq).toHaveBeenCalledWith("id", taskId);
    expect(query.eq).toHaveBeenCalledWith("organization_id", organizationId);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "IN_PROGRESS", updated_by: userId }),
    );
    expect(mocks.update.mock.calls[0]?.[0]).not.toHaveProperty("created_by");
    expect(mocks.update.mock.calls[0]?.[0]).not.toHaveProperty("completed_at");
  });

  it("makes duplicate completion requests target the same idempotent status transition", async () => {
    const form = new FormData();
    form.set("taskId", taskId);
    form.set("completed", "true");

    await setTaskCompletionAction(initialTaskActionState, form);
    await setTaskCompletionAction(initialTaskActionState, form);
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.update.mock.calls.map(([payload]) => payload.status)).toEqual([
      "COMPLETED",
      "COMPLETED",
    ]);
    expect(mocks.update.mock.calls[0]?.[0]).not.toHaveProperty("completed_at");
  });

  it("reopens a task through a database-managed active transition", async () => {
    const form = new FormData();
    form.set("taskId", taskId);
    form.set("completed", "false");

    await setTaskCompletionAction(initialTaskActionState, form);
    expect(mocks.update).toHaveBeenCalledWith({
      status: "TODO",
      updated_by: userId,
    });
  });

  it("adds comments with server-derived organization and creator provenance", async () => {
    const form = new FormData();
    form.set("taskId", taskId);
    form.set("body", "The launch notes should include owners.");

    await addTaskCommentAction(initialTaskActionState, form);
    expect(mocks.from).toHaveBeenCalledWith("task_comments");
    expect(mocks.insert).toHaveBeenCalledWith({
      body: "The launch notes should include owners.",
      created_by: userId,
      organization_id: organizationId,
      task_id: taskId,
    });
  });
});
