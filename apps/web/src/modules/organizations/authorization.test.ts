import { describe, expect, it, vi } from "vitest";

import type { MembershipRow } from "@/lib/supabase/database.types";

import {
  authorizeOrganizationMembership,
  canManageOrganization,
  OrganizationAccessDeniedError,
} from "./authorization";

const userA = "00000000-0000-0000-0000-000000000001";
const userB = "00000000-0000-0000-0000-000000000002";
const organizationA = "10000000-0000-4000-8000-000000000001";

function membership(overrides: Partial<MembershipRow> = {}): MembershipRow {
  return {
    created_at: "2026-08-25T00:00:00.000Z",
    organization_id: organizationA,
    removed_at: null,
    role: "OWNER",
    user_id: userA,
    ...overrides,
  };
}

describe("organization authorization", () => {
  it("accepts a validated membership for the authenticated user", async () => {
    const findMembership = vi.fn().mockResolvedValue(membership());

    await expect(
      authorizeOrganizationMembership({
        lookup: { findMembership },
        organizationId: organizationA,
        userId: userA,
      }),
    ).resolves.toMatchObject({ role: "OWNER", user_id: userA });
    expect(findMembership).toHaveBeenCalledWith({
      organizationId: organizationA,
      userId: userA,
    });
  });

  it("rejects a removed membership", async () => {
    const findMembership = vi
      .fn()
      .mockResolvedValue(membership({ removed_at: "2026-08-25T01:00:00Z" }));
    await expect(
      authorizeOrganizationMembership({
        lookup: { findMembership },
        organizationId: organizationA,
        userId: userA,
      }),
    ).rejects.toBeInstanceOf(OrganizationAccessDeniedError);
  });

  it("rejects non-members and cross-user lookup results", async () => {
    await expect(
      authorizeOrganizationMembership({
        lookup: { findMembership: vi.fn().mockResolvedValue(null) },
        organizationId: organizationA,
        userId: userA,
      }),
    ).rejects.toBeInstanceOf(OrganizationAccessDeniedError);

    await expect(
      authorizeOrganizationMembership({
        lookup: {
          findMembership: vi
            .fn()
            .mockResolvedValue(membership({ user_id: userB })),
        },
        organizationId: organizationA,
        userId: userA,
      }),
    ).rejects.toBeInstanceOf(OrganizationAccessDeniedError);
  });

  it("rejects malformed client-supplied organization identifiers", async () => {
    const findMembership = vi.fn();

    await expect(
      authorizeOrganizationMembership({
        lookup: { findMembership },
        organizationId: "not-a-uuid",
        userId: userA,
      }),
    ).rejects.toBeInstanceOf(OrganizationAccessDeniedError);
    expect(findMembership).not.toHaveBeenCalled();
  });

  it("limits organization management to owners and administrators", () => {
    expect(canManageOrganization("OWNER")).toBe(true);
    expect(canManageOrganization("ADMIN")).toBe(true);
    expect(canManageOrganization("MEMBER")).toBe(false);
    expect(canManageOrganization("VIEWER")).toBe(false);
  });
});
