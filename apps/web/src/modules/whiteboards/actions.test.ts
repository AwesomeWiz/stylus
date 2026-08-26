import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const builder = {
    eq: vi.fn(),
    insert: vi.fn(),
    is: vi.fn(),
    not: vi.fn(),
    maybeSingle: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
  };
  for (const key of ["eq", "insert", "is", "not", "select", "update"] as const)
    builder[key].mockReturnValue(builder);
  return {
    builder,
    from: vi.fn(() => builder),
    getContext: vi.fn(),
    revalidatePath: vi.fn(),
    rpc: vi.fn(),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
  unstable_rethrow: vi.fn(),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: vi.fn() },
  })),
}));

import {
  archiveBoardAction,
  createBoardCommentAction,
  createBoardAction,
  createBoardElementAction,
  restoreBoardElementAction,
  updateBoardElementAction,
} from "./actions";

const userId = "00000000-0000-4000-8000-000000000001";
const organizationId = "10000000-0000-4000-8000-000000000001";
const boardId = "20000000-0000-4000-8000-000000000001";
const elementId = "30000000-0000-4000-8000-000000000001";
const commentId = "40000000-0000-4000-8000-000000000001";

const board = {
  archived_at: null,
  created_at: "2026-08-25T00:00:00Z",
  created_by: userId,
  id: boardId,
  organization_id: organizationId,
  title: "Ideas",
  updated_at: "2026-08-25T00:00:00Z",
  updated_by: userId,
};
const element = {
  archived_at: null,
  board_id: boardId,
  content: { text: "Idea" },
  created_at: "2026-08-25T00:00:00Z",
  created_by: userId,
  element_type: "STICKY" as const,
  height: 180,
  id: elementId,
  metadata: {},
  organization_id: organizationId,
  rotation: 0,
  style: {},
  updated_at: "2026-08-25T00:00:00Z",
  updated_by: userId,
  width: 200,
  x: 10,
  y: 20,
  z_index: 1,
};
const comment = {
  archived_at: null,
  author_id: userId,
  board_id: boardId,
  body: "Please review @Teammate",
  created_at: "2026-08-25T00:00:00Z",
  element_id: null,
  id: commentId,
  organization_id: organizationId,
  parent_id: null,
  updated_at: "2026-08-25T00:00:00Z",
};

describe("whiteboard actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of [
      "eq",
      "insert",
      "is",
      "not",
      "select",
      "update",
    ] as const)
      mocks.builder[key].mockReturnValue(mocks.builder);
    mocks.getContext.mockResolvedValue({
      membership: { role: "MEMBER" },
      organization: { id: organizationId },
      user: { id: userId },
    });
  });

  it("derives organization and creator when a member creates a board", async () => {
    mocks.builder.single.mockResolvedValue({ data: board, error: null });
    await expect(createBoardAction(" Ideas ")).resolves.toEqual({
      data: board,
      status: "success",
    });
    expect(mocks.builder.insert).toHaveBeenCalledWith({
      created_by: userId,
      organization_id: organizationId,
      title: "Ideas",
      updated_by: userId,
    });
  });

  it("creates elements only with the authenticated organization provenance", async () => {
    mocks.builder.single.mockResolvedValue({ data: element, error: null });
    const result = await createBoardElementAction({
      boardId,
      content: { text: "Idea" },
      elementType: "STICKY",
      height: 180,
      metadata: {},
      rotation: 0,
      style: {},
      width: 200,
      x: 10,
      y: 20,
      zIndex: 1,
    });
    expect(result.status).toBe("success");
    expect(mocks.builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        board_id: boardId,
        created_by: userId,
        organization_id: organizationId,
        updated_by: userId,
      }),
    );
  });

  it("scopes final drag persistence to element and current organization", async () => {
    mocks.builder.maybeSingle.mockResolvedValue({
      data: { ...element, x: 250, y: 310 },
      error: null,
    });
    await updateBoardElementAction({ elementId, x: 250, y: 310 });
    expect(mocks.builder.update).toHaveBeenCalledWith({
      updated_by: userId,
      x: 250,
      y: 310,
    });
    expect(mocks.builder.eq).toHaveBeenCalledWith("id", elementId);
    expect(mocks.builder.eq).toHaveBeenCalledWith(
      "organization_id",
      organizationId,
    );
  });

  it("archives instead of deleting board history", async () => {
    mocks.builder.maybeSingle.mockResolvedValue({
      data: { id: boardId },
      error: null,
    });
    const result = await archiveBoardAction(boardId);
    expect(result.status).toBe("success");
    expect(mocks.builder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        archived_at: expect.any(String),
        updated_by: userId,
      }),
    );
  });

  it("restores archived elements only in the authenticated organization", async () => {
    mocks.builder.maybeSingle.mockResolvedValue({ data: element, error: null });
    const result = await restoreBoardElementAction(elementId);
    expect(result.status).toBe("success");
    expect(mocks.builder.update).toHaveBeenCalledWith({
      archived_at: null,
      updated_by: userId,
    });
    expect(mocks.builder.eq).toHaveBeenCalledWith("id", elementId);
    expect(mocks.builder.eq).toHaveBeenCalledWith(
      "organization_id",
      organizationId,
    );
    expect(mocks.builder.not).toHaveBeenCalledWith("archived_at", "is", null);
  });

  it("rejects VIEWER mutation before opening a database query", async () => {
    mocks.getContext.mockResolvedValue({
      membership: { role: "VIEWER" },
      organization: { id: organizationId },
      user: { id: userId },
    });
    const result = await createBoardAction("Private plan");
    expect(result.status).toBe("error");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("passes structural mention identities to the guarded comment RPC", async () => {
    const mentionedUserId = "50000000-0000-4000-8000-000000000001";
    mocks.rpc.mockResolvedValue({ data: comment, error: null });
    await expect(
      createBoardCommentAction({
        boardId,
        body: "Please review @Teammate",
        elementId: null,
        mentionedUserIds: [mentionedUserId, mentionedUserId],
        parentId: null,
      }),
    ).resolves.toEqual({ data: comment, status: "success" });
    expect(mocks.rpc).toHaveBeenCalledWith("create_board_comment", {
      p_board_id: boardId,
      p_body: "Please review @Teammate",
      p_element_id: null,
      p_mentioned_user_ids: [mentionedUserId],
      p_parent_id: null,
    });
  });

  it("rejects VIEWER comments before invoking the security-definer RPC", async () => {
    mocks.getContext.mockResolvedValue({
      membership: { role: "VIEWER" },
      organization: { id: organizationId },
      user: { id: userId },
    });
    const result = await createBoardCommentAction({
      boardId,
      body: "Cannot write",
      elementId: null,
      mentionedUserIds: [],
      parentId: null,
    });
    expect(result.status).toBe("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
