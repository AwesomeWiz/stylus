import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

import { inviteTeamMemberAction } from "./team-actions";

const organizationId = "10000000-0000-4000-8000-000000000001";

describe("organization invitation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockResolvedValue({
      membership: { role: "OWNER" },
      organization: { id: organizationId },
      user: { id: "00000000-0000-4000-8000-000000000001" },
    });
    mocks.rpc.mockResolvedValue({ data: "invite-id", error: null });
  });

  it.each(["MEMBER", "VIEWER"] as const)(
    "lets an OWNER create a hashed %s invitation scoped to current organization",
    async (role) => {
      const form = new FormData();
      form.set("email", " Teammate@Example.com ");
      form.set("role", role);
      const result = await inviteTeamMemberAction({ status: "idle" }, form);
      expect(result.status).toBe("success");
      expect(result.inviteLink).toMatch(/\/invite\/[A-Za-z0-9_-]{43}$/);
      expect(mocks.rpc).toHaveBeenCalledWith(
        "create_organization_invitation",
        expect.objectContaining({
          p_email: "teammate@example.com",
          p_organization_id: organizationId,
          p_role: role,
          p_token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      );
      expect(result.inviteLink).not.toContain(
        mocks.rpc.mock.calls[0]?.[1].p_token_hash,
      );
    },
  );

  it.each(["MEMBER", "VIEWER"])(
    "blocks a %s before opening an invitation RPC",
    async (role) => {
      mocks.getContext.mockResolvedValue({ membership: { role } });
      const form = new FormData();
      form.set("email", "teammate@example.com");
      form.set("role", "MEMBER");
      const result = await inviteTeamMemberAction({ status: "idle" }, form);
      expect(result.status).toBe("error");
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("handles duplicate active invitations without leaking database details", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23505" } });
    const form = new FormData();
    form.set("email", "teammate@example.com");
    form.set("role", "MEMBER");
    const result = await inviteTeamMemberAction({ status: "idle" }, form);
    expect(result).toEqual({
      message: "This person is already a member or has a pending invitation.",
      status: "error",
    });
  });
});
