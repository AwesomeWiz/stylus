import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ from: mocks.from })),
}));

import { getOrganizationPluginStates } from "./data";

describe("organization plugin state data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads all organization plugin states in one ordered query", async () => {
    const query = {
      eq: vi.fn(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      select: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.from.mockReturnValue(query);
    await expect(
      getOrganizationPluginStates("10000000-0000-4000-8000-000000000001"),
    ).resolves.toEqual([]);
    expect(mocks.from).toHaveBeenCalledOnce();
    expect(mocks.from).toHaveBeenCalledWith("organization_plugins");
    expect(query.eq).toHaveBeenCalledWith(
      "organization_id",
      "10000000-0000-4000-8000-000000000001",
    );
  });
});
