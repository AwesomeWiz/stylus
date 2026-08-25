import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn<(path: string) => never>(),
  requireAuthenticatedUser: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));

vi.mock("@/modules/auth/server/session", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { createOrganizationAction } from "./actions";
import { initialOrganizationActionState } from "./schemas";

describe("organization creation action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.requireAuthenticatedUser.mockResolvedValue({
      displayName: "Alex Morgan",
      email: "alex@example.test",
      id: "00000000-0000-4000-8000-000000000001",
    });
    mocks.redirect.mockImplementation((path) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("rejects invalid names before authentication or database calls", async () => {
    const formData = new FormData();
    formData.set("name", "A");

    const result = await createOrganizationAction(
      initialOrganizationActionState,
      formData,
    );

    expect(result.status).toBe("error");
    expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("revalidates identity and uses the atomic organization RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: "organization-id" },
      error: null,
    });
    const formData = new FormData();
    formData.set("name", "  Acme  ");

    await expect(
      createOrganizationAction(initialOrganizationActionState, formData),
    ).rejects.toThrow("redirect:/");
    expect(mocks.requireAuthenticatedUser).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("create_organization", {
      p_name: "Acme",
    });
  });
});
