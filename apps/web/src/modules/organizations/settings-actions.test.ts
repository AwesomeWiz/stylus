import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieDelete: vi.fn(),
  from: vi.fn(),
  getContext: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  removeBoardImages: vi.fn(),
  removeReelMedia: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ delete: mocks.cookieDelete })),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: vi.fn(() => ({
    from: mocks.from,
    storage: {
      from: (bucket: string) => ({
        remove:
          bucket === "board-images"
            ? mocks.removeBoardImages
            : mocks.removeReelMedia,
      }),
    },
  })),
}));

import { deleteOrganizationAction } from "./settings-actions";

const organizationId = "10000000-0000-4000-8000-000000000001";

describe("organization settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockResolvedValue({
      membership: { role: "OWNER" },
      organization: { id: organizationId, name: "Stylus Labs" },
    });
    mocks.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: vi.fn().mockResolvedValue(
          table === "board_elements"
            ? {
                data: [
                  {
                    metadata: { storagePath: `${organizationId}/board/a.png` },
                  },
                  { metadata: { storagePath: "outside/ignored.png" } },
                ],
                error: null,
              }
            : {
                data: [{ storage_path: `${organizationId}/reel/source.mp4` }],
                error: null,
              },
        ),
      }),
    }));
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.removeBoardImages.mockResolvedValue({ error: null });
    mocks.removeReelMedia.mockResolvedValue({ error: null });
  });

  it.each(["ADMIN", "MEMBER", "VIEWER"])(
    "rejects %s before storage inventory or database mutation",
    async (role) => {
      mocks.getContext.mockResolvedValue({ membership: { role } });
      const form = new FormData();
      form.set("confirmationName", "Stylus Labs");
      const result = await deleteOrganizationAction({ status: "idle" }, form);
      expect(result.status).toBe("error");
      expect(mocks.from).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("requires an exact organization-name confirmation", async () => {
    const form = new FormData();
    form.set("confirmationName", "stylus labs");
    const result = await deleteOrganizationAction({ status: "idle" }, form);
    expect(result).toEqual({
      message: "The organization name does not match.",
      status: "error",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("uses the owner-scoped RPC and removes only exact tenant storage paths", async () => {
    const form = new FormData();
    form.set("confirmationName", "Stylus Labs");
    await deleteOrganizationAction({ status: "idle" }, form);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_owned_organization", {
      p_confirmation_name: "Stylus Labs",
      p_organization_id: organizationId,
    });
    expect(mocks.removeBoardImages).toHaveBeenCalledWith([
      `${organizationId}/board/a.png`,
    ]);
    expect(mocks.removeReelMedia).toHaveBeenCalledWith([
      `${organizationId}/reel/source.mp4`,
    ]);
    expect(mocks.cookieDelete).toHaveBeenCalledWith("stylus_organization_id");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith("/organization/new");
  });
});
