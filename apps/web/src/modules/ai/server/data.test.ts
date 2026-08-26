import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ from: mocks.from })),
}));

import { getOrganizationAIPolicy } from "./data";

function policyQuery(result: { data: unknown; error: unknown }) {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    select: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

describe("organization AI policy data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads a persisted organization policy", async () => {
    const policy = {
      allowed_provider_ids: ["ollama"],
      default_tier: "FAST",
      execution_mode: "LOCAL_ONLY",
      organization_id: "10000000-0000-4000-8000-000000000001",
    };
    const query = policyQuery({ data: policy, error: null });
    mocks.from.mockReturnValue(query);

    await expect(getOrganizationAIPolicy(policy.organization_id)).resolves.toBe(
      policy,
    );
    expect(mocks.from).toHaveBeenCalledWith("organization_ai_policies");
    expect(query.eq).toHaveBeenCalledWith(
      "organization_id",
      policy.organization_id,
    );
  });

  it("returns null when no policy has been persisted", async () => {
    mocks.from.mockReturnValue(policyQuery({ data: null, error: null }));
    await expect(
      getOrganizationAIPolicy("10000000-0000-4000-8000-000000000002"),
    ).resolves.toBeNull();
  });

  it("does not expose Supabase details when policy loading fails", async () => {
    mocks.from.mockReturnValue(
      policyQuery({ data: null, error: { message: "internal table detail" } }),
    );
    await expect(
      getOrganizationAIPolicy("10000000-0000-4000-8000-000000000003"),
    ).rejects.toThrow("Organization AI policy could not be loaded");
  });
});
