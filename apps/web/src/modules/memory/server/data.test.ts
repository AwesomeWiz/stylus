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

import { getCompanyKnowledge, getCompanyMemories } from "./data";

const organizationId = "10000000-0000-4000-8000-000000000001";

describe("memory server data", () => {
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
