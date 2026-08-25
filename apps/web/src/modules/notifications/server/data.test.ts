import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), from: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));

import { getNotificationSummary } from "./data";

const organizationId = "10000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000001";

function query(result: Record<string, unknown>) {
  const chain = {
    eq: vi.fn(() => chain),
    is: vi.fn(() => Promise.resolve(result)),
    limit: vi.fn(() => Promise.resolve(result)),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
  };
  return chain;
}

describe("notification server data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const recent = query({ data: [], error: null });
    const unread = query({ count: 3, data: null, error: null });
    mocks.from.mockReturnValueOnce(recent).mockReturnValueOnce(unread);
    mocks.createClient.mockResolvedValue({ from: mocks.from });
  });

  it("scopes recent and unread queries to the current recipient and organization", async () => {
    await expect(
      getNotificationSummary(organizationId, userId),
    ).resolves.toEqual({ items: [], unreadCount: 3 });

    for (const result of mocks.from.mock.results) {
      expect(result.value.eq).toHaveBeenCalledWith(
        "organization_id",
        organizationId,
      );
      expect(result.value.eq).toHaveBeenCalledWith("recipient_id", userId);
    }
  });
});
