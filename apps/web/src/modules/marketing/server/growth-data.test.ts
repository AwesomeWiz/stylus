import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  limit: vi.fn(),
  ilike: vi.fn(),
  gt: vi.fn(),
  rpc: vi.fn(),
  rows: [] as Record<string, unknown>[],
}));
vi.mock("@/modules/plugins/server/guard", () => ({
  requireEnabledPlugin: mocks.guard,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));
vi.mock("@/plugins", () => ({ getBoardEntityRegistry: vi.fn() }));
vi.mock("@/core/memory/server", () => ({ findCompanyMemoryCreation: vi.fn() }));
import { getGrowthList } from "./growth-data";
const org = crypto.randomUUID(),
  foreign = crypto.randomUUID();
beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue({
    context: {
      organization: { id: org },
      user: { id: crypto.randomUUID() },
      membership: { role: "VIEWER" },
    },
  });
  mocks.rows = [];
  const chain = {
    select: mocks.select,
    eq: mocks.eq,
    limit: mocks.limit,
    ilike: mocks.ilike,
    gt: mocks.gt,
    is: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    then: (done: (v: unknown) => unknown) =>
      Promise.resolve({ data: mocks.rows, error: null }).then(done),
  };
  for (const f of [
    chain.select,
    chain.eq,
    chain.limit,
    chain.ilike,
    chain.gt,
    chain.is,
    chain.not,
    chain.order,
  ])
    f.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
  mocks.rpc.mockResolvedValue({ data: [], error: null });
});
describe("bounded scoped growth lists", () => {
  it("derives tenant scope and excludes detail/result bodies from list projections", async () => {
    await getGrowthList("experiment", {
      query: "100%_setup",
      organizationId: foreign,
      status: "RUNNING",
      after: foreign,
    });
    expect(mocks.guard).toHaveBeenCalledWith("marketing");
    expect(mocks.eq).toHaveBeenCalledWith("organization_id", org);
    expect(mocks.eq).toHaveBeenCalledWith("status", "RUNNING");
    expect(mocks.select.mock.calls[0]![0]).not.toMatch(
      /\*|test_plan|result_summary|success_criteria|statement/,
    );
    expect(mocks.limit).toHaveBeenCalledWith(26);
    expect(mocks.gt).toHaveBeenCalledWith("id", foreign);
    expect(mocks.ilike).toHaveBeenCalledWith(
      "title",
      expect.stringContaining("\\%\\_"),
    );
  });
  it("bounds a large fixture and batches counts in one RPC", async () => {
    mocks.rows = Array.from({ length: 26 }, () => ({
      id: crypto.randomUUID(),
      title: "Belief",
      updated_at: "2026-11-09T00:00:00Z",
      archived_at: null,
    }));
    const page = await getGrowthList("hypothesis", {});
    expect(page.rows).toHaveLength(25);
    expect(page.hasMore).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("marketing_growth_counts", {
      p_organization_id: org,
      p_ids: page.rows.map((r) => r.id),
    });
  });
  it("ignores invalid lifecycle filters and cursors without interpolating them", async () => {
    await getGrowthList("hypothesis", { status: "PROVEN", after: "not-an-id" });
    expect(mocks.eq).not.toHaveBeenCalledWith("status", "PROVEN");
    expect(mocks.gt).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
