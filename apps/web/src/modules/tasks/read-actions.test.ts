import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  client: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.client,
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
import { loadTaskComments, loadTaskDetail } from "./read-actions";

const organizationId = "20000000-0000-4000-8000-000000000001";
const taskId = "10000000-0000-4000-8000-000000000001";
function query(data: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    or: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    limit: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return chain;
}
describe("authorized lazy Task reads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.context.mockResolvedValue({
      organization: { id: organizationId },
      membership: { role: "VIEWER" },
    });
    mocks.client.mockResolvedValue({ from: mocks.from });
  });
  it("loads an authorized direct task independently of the list, including for VIEWER", async () => {
    const task = { id: taskId, title: "Exact task" };
    const taskQuery = query(task);
    mocks.from.mockReturnValue(taskQuery);
    expect(await loadTaskDetail({ organizationId, taskId })).toEqual({
      status: "success",
      task,
      canMutate: false,
    });
    expect(mocks.context).toHaveBeenCalledTimes(1);
    expect(taskQuery.eq.mock.calls).toEqual([
      ["organization_id", organizationId],
      ["id", taskId],
    ]);
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).not.toHaveBeenCalledWith("task_comments");
  });
  it("returns the same unavailable result for foreign and nonexistent task IDs", async () => {
    mocks.from.mockReturnValue(query(null));
    expect(await loadTaskDetail({ organizationId, taskId })).toEqual({
      status: "unavailable",
    });
    expect(await loadTaskComments({ organizationId, taskId })).toEqual({
      status: "unavailable",
    });
    expect(mocks.from).not.toHaveBeenCalledWith("task_comments");
  });
  it("rechecks context after revocation or organization change without querying private content", async () => {
    mocks.context
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ organization: { id: "other" } });
    expect(await loadTaskDetail({ organizationId, taskId })).toEqual({
      status: "unavailable",
    });
    expect(await loadTaskComments({ organizationId, taskId })).toEqual({
      status: "unavailable",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("validates identifiers and cursors before a database read", async () => {
    expect(await loadTaskDetail({ organizationId, taskId: "invalid" })).toEqual(
      { status: "unavailable" },
    );
    expect(
      await loadTaskComments({
        organizationId,
        taskId,
        before: { createdAt: "injected,expression", id: taskId },
      }),
    ).toEqual({ status: "unavailable" });
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it("bounds comments to 50, ordered by timestamp and ID with a stable earlier cursor", async () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      id: `${50 - index}`.padStart(8, "0") + "-0000-4000-8000-000000000001",
      created_at: "2026-11-01T12:00:00.000Z",
      body: `Comment ${50 - index}`,
    }));
    const taskQuery = query({ id: taskId });
    const commentsQuery = query(rows);
    mocks.from
      .mockReturnValueOnce(taskQuery)
      .mockReturnValueOnce(commentsQuery);
    const result = await loadTaskComments({ organizationId, taskId });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("Expected comments");
    expect(result.comments).toHaveLength(50);
    expect(result.comments[0]?.body).toBe("Comment 1");
    expect(result.comments.at(-1)?.body).toBe("Comment 50");
    expect(result.before).toEqual({
      createdAt: rows[49]!.created_at,
      id: rows[49]!.id,
    });
    expect(commentsQuery.eq.mock.calls).toEqual([
      ["organization_id", organizationId],
      ["task_id", taskId],
    ]);
    expect(commentsQuery.order.mock.calls).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: false }],
    ]);
    expect(commentsQuery.limit).toHaveBeenCalledWith(51);
    mocks.from
      .mockReturnValueOnce(query({ id: taskId }))
      .mockReturnValueOnce(commentsQuery);
    await loadTaskComments({ organizationId, taskId, before: result.before });
    expect(commentsQuery.or).toHaveBeenCalledWith(
      `created_at.lt.${rows[49]!.created_at},and(created_at.eq.${rows[49]!.created_at},id.lt.${rows[49]!.id})`,
    );
  });
  it("returns safe retryable failures without exposing provider bodies", async () => {
    mocks.client.mockRejectedValue(new Error("secret database path"));
    expect(await loadTaskDetail({ organizationId, taskId })).toEqual({
      status: "error",
    });
    expect(await loadTaskComments({ organizationId, taskId })).toEqual({
      status: "error",
    });
  });
});
