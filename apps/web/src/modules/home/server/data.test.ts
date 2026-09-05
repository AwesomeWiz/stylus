import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));

import { getHomeCoreData } from "./data";

function query() {
  const chain = {
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
  };
  return chain;
}

describe("home server data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValueOnce(query()).mockReturnValueOnce(query());
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.createClient.mockResolvedValue({
      from: mocks.from,
      rpc: mocks.rpc,
    });
  });

  it("loads a bounded organization-scoped dashboard projection", async () => {
    const organizationId = "10000000-0000-4000-8000-000000000001";
    await expect(getHomeCoreData(organizationId)).resolves.toEqual({
      activity: [],
      members: [],
      tasks: [],
    });

    expect(mocks.from).toHaveBeenNthCalledWith(1, "tasks");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "activity_events");
    for (const result of mocks.from.mock.results) {
      expect(result.value.eq).toHaveBeenCalledWith(
        "organization_id",
        organizationId,
      );
    }
    expect(mocks.from.mock.results[0]!.value.limit).toHaveBeenCalledWith(50);
    expect(mocks.from.mock.results[1]!.value.limit).toHaveBeenCalledWith(6);
    expect(mocks.rpc).toHaveBeenCalledWith("list_organization_task_members", {
      p_organization_id: organizationId,
    });
  });
});
