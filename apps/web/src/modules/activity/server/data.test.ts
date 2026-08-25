import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));

import { getActivityHistory } from "./data";

const organizationId = "10000000-0000-4000-8000-000000000001";

describe("activity server data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = {
      eq: vi.fn(() => chain),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      order: vi.fn(() => chain),
      select: vi.fn(() => chain),
    };
    mocks.from.mockReturnValue(chain);
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.createClient.mockResolvedValue({ from: mocks.from, rpc: mocks.rpc });
  });

  it("loads bounded history and identities within the current organization", async () => {
    await expect(getActivityHistory(organizationId)).resolves.toEqual({
      events: [],
      members: [],
    });
    const chain = mocks.from.mock.results[0]?.value;
    expect(chain.eq).toHaveBeenCalledWith("organization_id", organizationId);
    expect(chain.limit).toHaveBeenCalledWith(100);
    expect(mocks.rpc).toHaveBeenCalledWith("list_organization_task_members", {
      p_organization_id: organizationId,
    });
  });
});
