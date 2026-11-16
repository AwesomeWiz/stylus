import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  query: {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  },
  upload: vi.fn(),
  sign: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  redirect: () => {
    throw new Error("Redirect");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    from: () => mocks.query,
    storage: {
      from: () => ({
        upload: mocks.upload,
        createSignedUrl: mocks.sign,
        remove: mocks.remove,
      }),
    },
  }),
}));
import { board, object } from "@/test/board-fixtures";
import { uploadBoardImageAction } from "./actions";
const original = object({
  element_type: "IMAGE",
  content: {
    alt: "Original",
    caption: "Keep me",
    sourceUrl: "https://example.test/reference",
  },
  metadata: {
    storagePath: `${board.organization_id}/${board.id}/original.png`,
  },
});
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    boardId: board.id,
    x: "0",
    y: "0",
    width: "320",
    height: "240",
    zIndex: "1",
  }))
    data.set(key, value);
  data.set("file", new File(["image"], "reference.png", { type: "image/png" }));
  return data;
}
describe("Private board images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const name of ["select", "eq", "is", "insert", "update"] as const)
      mocks.query[name].mockReturnValue(mocks.query);
    mocks.context.mockResolvedValue({
      user: { id: board.created_by },
      organization: { id: board.organization_id },
      membership: { role: "MEMBER" },
    });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.sign.mockResolvedValue({
      data: { signedUrl: "private-preview" },
      error: null,
    });
    mocks.query.single.mockResolvedValue({ data: original, error: null });
    mocks.query.maybeSingle.mockResolvedValue({ data: original, error: null });
    mocks.remove.mockResolvedValue({ error: null });
  });
  it("uploads into the current tenant/board private path and retains a committed asset if signing throws", async () => {
    mocks.sign.mockRejectedValue(new Error("storage signing unavailable"));
    const result = await uploadBoardImageAction(form());
    expect(result).toMatchObject({
      status: "success",
      data: { element: original, signedUrl: "" },
    });
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`^${board.organization_id}/${board.id}/`),
      ),
      expect.any(File),
      expect.objectContaining({ upsert: false }),
    );
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("cleans up only a new asset whose row did not commit", async () => {
    mocks.query.single.mockResolvedValue({
      data: null,
      error: new Error("database failure"),
    });
    expect((await uploadBoardImageAction(form())).status).toBe("error");
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0]![0]]);
  });
  it("replaces the existing object, preserving content, comments identity and original asset history", async () => {
    const data = form();
    data.set("replaceElementId", original.id);
    await uploadBoardImageAction(data);
    expect(mocks.query.insert).not.toHaveBeenCalled();
    expect(mocks.query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          previousStoragePaths: [original.metadata.storagePath],
        }),
      }),
    );
    expect(mocks.query.update.mock.calls[0]![0]).not.toHaveProperty("content");
    expect(mocks.query.eq).toHaveBeenCalledWith("id", original.id);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("retries a committed upload by stable identity without uploading or creating again", async () => {
    const data = form(),
      id = crypto.randomUUID(),
      existing = {
        ...original,
        id,
        metadata: { ...original.metadata, uploadId: id },
      };
    data.set("uploadId", id);
    mocks.query.maybeSingle.mockResolvedValue({ data: existing, error: null });
    expect(await uploadBoardImageAction(data)).toMatchObject({
      status: "success",
      data: { element: existing },
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });
  it("preallocates a new upload identity so a lost response can be retried", async () => {
    const data = form(),
      id = crypto.randomUUID();
    data.set("uploadId", id);
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    await uploadBoardImageAction(data);
    expect(mocks.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        metadata: expect.objectContaining({ uploadId: id }),
      }),
    );
  });
  it("refuses locked replacements and current VIEWER uploads before Storage writes", async () => {
    const data = form();
    data.set("replaceElementId", original.id);
    mocks.query.maybeSingle.mockResolvedValue({
      data: { ...original, locked: true },
      error: null,
    });
    expect((await uploadBoardImageAction(data)).status).toBe("error");
    expect(mocks.upload).not.toHaveBeenCalled();
    mocks.context.mockResolvedValue({
      user: { id: board.created_by },
      organization: { id: board.organization_id },
      membership: { role: "VIEWER" },
    });
    expect((await uploadBoardImageAction(form())).status).toBe("error");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
