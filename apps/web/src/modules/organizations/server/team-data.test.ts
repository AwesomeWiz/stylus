import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUserById: vi.fn() }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: () => ({
    auth: { admin: { getUserById: mocks.getUserById } },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { getOrganizationMemberLastSignIns } from "./team-data";

const member = {
  created_at: "2026-08-25T00:00:00Z",
  display_name: "Founder",
  email: "founder@example.test",
  member_user_id: "00000000-0000-4000-8000-000000000001",
  role: "OWNER" as const,
};

describe("team Auth Admin projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserById.mockResolvedValue({
      data: { user: { last_sign_in_at: "2026-09-05T05:00:00Z" } },
      error: null,
    });
  });

  it.each(["MEMBER", "VIEWER"] as const)(
    "denies %s before opening Auth Admin",
    async (role) => {
      await expect(
        getOrganizationMemberLastSignIns(role, [member]),
      ).rejects.toThrow("Organization management permission required");
      expect(mocks.getUserById).not.toHaveBeenCalled();
    },
  );

  it.each(["OWNER", "ADMIN"] as const)(
    "returns only safe last-sign-in metadata to %s",
    async (role) => {
      await expect(
        getOrganizationMemberLastSignIns(role, [member]),
      ).resolves.toEqual([{ ...member, lastSignInAt: "2026-09-05T05:00:00Z" }]);
      expect(mocks.getUserById).toHaveBeenCalledWith(member.member_user_id);
    },
  );
});
