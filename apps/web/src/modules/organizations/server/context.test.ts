import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  cookie: vi.fn(),
  from: vi.fn(),
  request: 0,
  removed: false,
}));
// Model separate RSC request scopes; React.cache intentionally does not memoize
// outside a server render in ordinary Vitest execution.
vi.mock("react", () => ({
  cache: (fn: (...args: unknown[]) => unknown) => {
    const values = new Map<string, unknown>();
    return (...args: unknown[]) => {
      const key = JSON.stringify([mocks.request, ...args]);
      if (!values.has(key)) values.set(key, fn(...args));
      return values.get(key);
    };
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie }),
}));
vi.mock("@/modules/auth/server/session", () => ({
  requireAuthenticatedUser: mocks.user,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from: mocks.from }),
}));
import {
  getCurrentOrganizationContext,
  getOrganizationContextForRead,
  requireOrganizationMembership,
} from "./context";
const org = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";

beforeEach(() => {
  mocks.request++;
  mocks.removed = false;
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({
    id: "user",
    email: "user@example.test",
    displayName: "User",
  });
  mocks.cookie.mockReturnValue({ value: org });
  mocks.from.mockImplementation((table: string) => {
    const predicates: Record<string, unknown> = {};
    const result = () => ({
      data:
        table === "memberships"
          ? mocks.removed ||
            (predicates.organization_id && predicates.organization_id !== org)
            ? null
            : {
                organization_id: org,
                user_id: "user",
                removed_at: null,
                role: "MEMBER",
                created_at: "2026-01-01",
              }
          : { id: org, name: "Company" },
      error: null,
    });
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((key, value) => {
        predicates[key] = value;
        return query;
      }),
      is: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => result()),
      single: vi.fn(async () => result()),
    };
    return query;
  });
});

describe("request-scoped organization read context", () => {
  it("resolves selected membership once and organization once, reusing read composition", async () => {
    const context = await getCurrentOrganizationContext();
    expect(await getCurrentOrganizationContext()).toBe(context);
    expect(await getOrganizationContextForRead(org)).toBe(context);
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "memberships",
      "organizations",
    ]);
  });
  it("never turns a foreign selected cookie into tenant authority", async () => {
    mocks.cookie.mockReturnValue({ value: other });
    expect((await getCurrentOrganizationContext())?.organization.id).toBe(org);
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "memberships",
      "memberships",
      "organizations",
    ]);
    await expect(getOrganizationContextForRead(other)).rejects.toThrow(
      "Organization membership required",
    );
  });
  it("does not memoize the explicit membership authorization helper", async () => {
    await requireOrganizationMembership(org);
    mocks.removed = true;
    await expect(requireOrganizationMembership(org)).rejects.toThrow(
      "Organization membership required",
    );
  });
  it("does not carry membership across request boundaries", async () => {
    expect(await getCurrentOrganizationContext()).not.toBeNull();
    mocks.request++;
    mocks.removed = true;
    expect(await getCurrentOrganizationContext()).toBeNull();
  });
  it("fails closed if the organization cannot be read", async () => {
    const original = mocks.from.getMockImplementation()!;
    mocks.from.mockImplementation((table) =>
      table === "organizations"
        ? {
            select: () => ({
              eq: () => ({ single: async () => ({ data: null, error: {} }) }),
            }),
          }
        : original(table),
    );
    await expect(getCurrentOrganizationContext()).rejects.toThrow(
      "Organization membership required",
    );
  });
});
