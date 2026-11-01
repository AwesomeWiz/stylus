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
    limit: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    then: (resolve: (value: { data: never[]; error: null }) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
  };
  return chain;
}

describe("home server data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation(() => query());
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.createClient.mockResolvedValue({
      from: mocks.from,
      rpc: mocks.rpc,
    });
  });

  it("loads a bounded organization-scoped dashboard projection", async () => {
    const organizationId = "10000000-0000-4000-8000-000000000001";
    await expect(
      getHomeCoreData(
        organizationId,
        "viewer",
        new Date("2026-11-01T12:00:00Z"),
      ),
    ).resolves.toEqual({
      activity: [],
      members: [],
      tasks: [],
    });

    expect(mocks.from).toHaveBeenNthCalledWith(1, "tasks");
    expect(mocks.from).toHaveBeenNthCalledWith(5, "activity_events");
    for (const result of mocks.from.mock.results) {
      expect(result.value.eq).toHaveBeenCalledWith(
        "organization_id",
        organizationId,
      );
    }
    expect(mocks.from).toHaveBeenCalledTimes(5);
    for (const result of mocks.from.mock.results)
      expect(result.value.limit).toHaveBeenCalledWith(6);
    expect(mocks.from.mock.results[0]!.value.select).not.toHaveBeenCalledWith(
      "*",
    );
    expect(mocks.rpc).toHaveBeenCalledWith("list_organization_task_members", {
      p_organization_id: organizationId,
    });
  });
});
