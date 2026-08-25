import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));

import { getTaskWorkspaceData, validateTaskAssignee } from "./data";

const organizationId = "10000000-0000-4000-8000-000000000001";
const assigneeId = "00000000-0000-4000-8000-000000000002";

describe("task server data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const tasksQuery = {
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      select: vi.fn(() => tasksQuery),
    };
    const commentsQuery = {
      eq: vi.fn(() => commentsQuery),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      select: vi.fn(() => commentsQuery),
    };
    mocks.from.mockImplementation((table: string) =>
      table === "tasks" ? tasksQuery : commentsQuery,
    );
    mocks.rpc.mockResolvedValue({
      data: [
        {
          display_name: "Sam",
          member_user_id: assigneeId,
          role: "MEMBER",
        },
      ],
      error: null,
    });
    mocks.createClient.mockResolvedValue({ from: mocks.from, rpc: mocks.rpc });
  });

  it("scopes every task read and the member directory to the current organization", async () => {
    await getTaskWorkspaceData(organizationId);

    const taskQuery = mocks.from.mock.results[0]?.value;
    const commentQuery = mocks.from.mock.results[1]?.value;
    expect(taskQuery.eq).toHaveBeenCalledWith(
      "organization_id",
      organizationId,
    );
    expect(commentQuery.eq).toHaveBeenCalledWith(
      "organization_id",
      organizationId,
    );
    expect(mocks.rpc).toHaveBeenCalledWith("list_organization_task_members", {
      p_organization_id: organizationId,
    });
  });

  it("accepts only assignees returned by the organization member directory", async () => {
    await expect(
      validateTaskAssignee(organizationId, assigneeId),
    ).resolves.toBeUndefined();
    await expect(
      validateTaskAssignee(
        organizationId,
        "00000000-0000-4000-8000-000000000009",
      ),
    ).rejects.toThrow("assignee");
  });
});
