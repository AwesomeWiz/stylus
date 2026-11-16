import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    or: vi.fn(),
    gt: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  };
  return {
    query,
    context: vi.fn(),
    from: vi.fn((table: string) => {
      void table;
      return query;
    }),
    sign: vi.fn(),
    rpc: vi.fn(),
  };
});
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: () => ({ createSignedUrls: mocks.sign }) },
  }),
}));
import { board, object } from "@/test/board-fixtures";
import {
  readBoardCommentsAction,
  readBoardImagesAction,
  readBoardSnapshotAction,
  readBoardPreviewAction,
} from "./read-actions";
import { getBoardEditorData } from "./server/data";
const scope = { boardId: board.id, organizationId: board.organization_id };
describe("Board read boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of [
      "select",
      "eq",
      "is",
      "in",
      "order",
      "or",
      "gt",
    ] as const)
      mocks.query[method].mockReturnValue(mocks.query);
    mocks.context.mockResolvedValue({
      organization: { id: board.organization_id },
      membership: { role: "MEMBER" },
    });
    mocks.query.maybeSingle.mockResolvedValue({ data: board, error: null });
    mocks.query.limit.mockResolvedValue({ data: [], error: null });
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.sign.mockResolvedValue({ data: [], error: null });
  });
  it("checks fresh membership and rejects a forged organization before a data read", async () => {
    expect(
      (
        await readBoardCommentsAction({
          ...scope,
          organizationId: crypto.randomUUID(),
        })
      ).status,
    ).toBe("error");
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.context.mockResolvedValue(null);
    expect(
      (await readBoardImagesAction({ ...scope, ids: [crypto.randomUUID()] }))
        .status,
    ).toBe("error");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects a missing/foreign/archived board before comments or signing", async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await readBoardCommentsAction(scope)).status).toBe("error");
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.query.eq).toHaveBeenCalledWith(
      "organization_id",
      board.organization_id,
    );
    expect(mocks.query.is).toHaveBeenCalledWith("archived_at", null);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("starts the editor with zero comment reads and zero storage requests", async () => {
    const row = object();
    mocks.query.limit.mockResolvedValue({ data: [row], error: null });
    const data = await getBoardEditorData(board.organization_id, board.id);
    expect(data).toMatchObject({
      elements: [row],
      comments: [],
      imageUrls: {},
    });
    expect(mocks.from.mock.calls.map((args) => args[0])).not.toContain(
      "board_comments",
    );
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("loads complete object pages rather than silently dropping object 1001", async () => {
    const page = Array.from({ length: 1000 }, () => object()),
      last = object();
    mocks.query.limit
      .mockResolvedValueOnce({ data: page, error: null })
      .mockResolvedValueOnce({ data: [last], error: null });
    expect(
      (await getBoardEditorData(board.organization_id, board.id))?.elements,
    ).toHaveLength(1001);
    expect(mocks.query.gt).toHaveBeenCalledWith("id", page.at(-1)!.id);
  });
  it("returns bounded newest comments with an exact deterministic earlier cursor", async () => {
    const rows = Array.from({ length: 201 }, () => ({
      id: crypto.randomUUID(),
      created_at: "2026-11-01T00:00:00Z",
      parent_id: null,
    }));
    mocks.query.limit.mockResolvedValue({ data: rows, error: null });
    const result = await readBoardCommentsAction(scope);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.comments).toHaveLength(200);
      expect(result.before).toEqual({
        createdAt: rows[199]!.created_at,
        id: rows[199]!.id,
      });
    }
    expect(mocks.query.order).toHaveBeenCalledWith("id", { ascending: false });
    expect(mocks.query.limit).toHaveBeenCalledWith(201);
  });
  it("rejects an injected cursor instead of placing it in a Supabase filter", async () => {
    expect(
      (
        await readBoardCommentsAction({
          ...scope,
          before: { createdAt: "now),or(secret)", id: crypto.randomUUID() },
        })
      ).status,
    ).toBe("error");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("accepts PostgreSQL fractional timestamps with UTC offsets for earlier pages", async () => {
    const id = crypto.randomUUID(),
      createdAt = "2026-11-01T10:10:10.123456+00:00";
    expect(
      (await readBoardCommentsAction({ ...scope, before: { createdAt, id } }))
        .status,
    ).toBe("success");
    expect(mocks.query.or).toHaveBeenCalledWith(
      `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`,
    );
  });
  it("batch-signs only current-board private paths and maps URLs by path", async () => {
    const first = object({
        element_type: "IMAGE",
        metadata: {
          storagePath: `${board.organization_id}/${board.id}/first.png`,
        },
      }),
      second = object({
        element_type: "IMAGE",
        metadata: {
          storagePath: `${board.organization_id}/${board.id}/second.png`,
        },
      }),
      foreign = object({
        element_type: "IMAGE",
        metadata: { storagePath: "foreign/path.png" },
      });
    mocks.query.limit.mockResolvedValue({
      data: [first, second, foreign],
      error: null,
    });
    mocks.sign.mockResolvedValue({
      data: [
        { path: second.metadata.storagePath, signedUrl: "signed-second" },
        { path: first.metadata.storagePath, signedUrl: "signed-first" },
      ],
      error: null,
    });
    const result = await readBoardImagesAction({
      ...scope,
      ids: [first.id, second.id, foreign.id],
    });
    expect(mocks.sign).toHaveBeenCalledWith(
      [first.metadata.storagePath, second.metadata.storagePath],
      3600,
      expect.objectContaining({ cacheNonce: expect.any(String) }),
    );
    expect(result.status).toBe("success");
    if (result.status === "success")
      expect(result.images.map((row) => row.url)).toEqual([
        "signed-first",
        "signed-second",
      ]);
  });
  it("bounds image batches and returns a safe signing failure", async () => {
    expect(
      (
        await readBoardImagesAction({
          ...scope,
          ids: Array.from({ length: 26 }, () => crypto.randomUUID()),
        })
      ).status,
    ).toBe("error");
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.query.limit.mockResolvedValue({
      data: [
        object({
          metadata: {
            storagePath: `${board.organization_id}/${board.id}/a.png`,
          },
        }),
      ],
      error: null,
    });
    mocks.sign.mockRejectedValue(new Error("private storage provider body"));
    expect(
      await readBoardImagesAction({ ...scope, ids: [crypto.randomUUID()] }),
    ).toEqual({
      status: "error",
      message: "Image previews could not load. Retry previews.",
    });
  });
  it("rejects normalizable, encoded and URL-shaped asset suffixes before signing", async () => {
    const prefix = `${board.organization_id}/${board.id}/`;
    for (const suffix of [
      "../../foreign.png",
      "%2e%2e/foreign.png",
      "file.png?token=secret",
      "file.png#fragment",
      "folder/file.png",
    ]) {
      mocks.query.limit.mockResolvedValue({
        data: [object({ metadata: { storagePath: prefix + suffix } })],
        error: null,
      });
      expect(
        await readBoardImagesAction({ ...scope, ids: [crypto.randomUUID()] }),
      ).toEqual({ status: "success", images: [] });
    }
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("returns current read-only authority with a reconnect snapshot", async () => {
    mocks.context.mockResolvedValue({
      organization: { id: board.organization_id },
      membership: { role: "VIEWER" },
    });
    expect(await readBoardSnapshotAction(scope)).toMatchObject({
      status: "success",
      canMutate: false,
      rows: [],
    });
  });

  it("rejects a forged thumbnail organization before any record read", async () => {
    expect(
      (
        await readBoardPreviewAction({
          ...scope,
          organizationId: crypto.randomUUID(),
        })
      ).status,
    ).toBe("error");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("reauthorizes active boards and bounds a preview without signing private assets", async () => {
    const result = await readBoardPreviewAction(scope);
    expect(result.status).toBe("success");
    expect(mocks.query.limit).toHaveBeenCalledWith(128);
    const projection = mocks.query.select.mock.calls
      .map((call) => call[0])
      .find(
        (value) => typeof value === "string" && value.includes("element_type"),
      );
    expect(projection).not.toMatch(/metadata|storagePath|comments/);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("fails thumbnails closed when an active board cannot be resolved", async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await readBoardPreviewAction(scope)).status).toBe("error");
    expect(mocks.query.limit).not.toHaveBeenCalled();
  });
});
