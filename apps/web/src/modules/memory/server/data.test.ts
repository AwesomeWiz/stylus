import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOnboarding: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));
vi.mock("@/modules/onboarding/server/data", () => ({
  getOnboardingData: mocks.getOnboarding,
}));

import {
  getCompanyKnowledge,
  getCompanyMemories,
  getCompanyMemory,
} from "./data";

const organizationId = "10000000-0000-4000-8000-000000000001";

describe("memory server data", () => {
  it("opens one exact company-domain identity without searching unrelated bodies", async () => {
    const id = crypto.randomUUID(),
      q = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id, title: "Reviewed Note decision" },
          error: null,
        }),
      };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    const from = vi.fn(() => q);
    mocks.createClient.mockResolvedValue({ from });
    expect(await getCompanyMemory(organizationId, id)).toEqual([
      { id, title: "Reviewed Note decision" },
    ]);
    expect(from).toHaveBeenCalledExactlyOnceWith("knowledge_memories");
    expect(q.eq.mock.calls).toEqual([
      ["organization_id", organizationId],
      ["domain", "company"],
      ["id", id],
    ]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("returns no identity or title for an invalid or RLS-unavailable exact opener", async () => {
    expect(await getCompanyMemory(organizationId, "forged")).toEqual([]);
    expect(mocks.createClient).not.toHaveBeenCalled();
    const q = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    mocks.createClient.mockResolvedValue({ from: () => q });
    expect(await getCompanyMemory(organizationId, crypto.randomUUID())).toEqual(
      [],
    );
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.getOnboarding.mockResolvedValue({
      audience: null,
      brand: null,
      company: {
        company_name: "Current profile name",
        industry: "Productivity",
        primary_market: null,
        short_description: "Canonical profile source.",
        stage: "MVP",
      },
      competitors: [],
      marketing: null,
    });
  });

  it("composes every Company Knowledge read from canonical onboarding data", async () => {
    const knowledge = await getCompanyKnowledge(organizationId);
    expect(mocks.getOnboarding).toHaveBeenCalledWith(organizationId);
    expect(knowledge.sections.identity?.companyName).toBe(
      "Current profile name",
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("uses the bounded company-only search RPC", async () => {
    await getCompanyMemories(organizationId, {
      archived: true,
      kind: "DECISION",
      provenance: "HUMAN",
      search: "launch",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("search_company_memories", {
      p_include_archived: true,
      p_kinds: ["DECISION"],
      p_limit: 50,
      p_organization_id: organizationId,
      p_provenance: ["HUMAN"],
      p_search: "launch",
    });
  });
});
