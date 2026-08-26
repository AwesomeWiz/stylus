import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configuredProviders: vi.fn(() => ["ollama", "openai-compatible"]),
  context: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("./server/configured", () => ({
  getConfiguredAIProviderIds: mocks.configuredProviders,
}));

import { updateOrganizationAIPolicyAction } from "./actions";
import { initialAIPolicyActionState } from "./schemas";

function form(providerId = "ollama") {
  const data = new FormData();
  data.set("executionMode", "LOCAL_ONLY");
  data.set("defaultTier", "FAST");
  data.set("monthlyRemoteCostLimitUsd", "25");
  data.append("allowedProviderIds", providerId);
  return data;
}

describe("organization AI policy action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "allows %s to save policy for the server-derived organization",
    async (role) => {
      mocks.context.mockResolvedValue({
        membership: { role },
        organization: { id: "10000000-0000-4000-8000-000000000001" },
      });
      await expect(
        updateOrganizationAIPolicyAction(initialAIPolicyActionState, form()),
      ).resolves.toEqual({ message: "AI policy saved.", status: "success" });
      expect(mocks.rpc).toHaveBeenCalledWith("set_organization_ai_policy", {
        p_allowed_provider_ids: ["ollama"],
        p_default_tier: "FAST",
        p_execution_mode: "LOCAL_ONLY",
        p_monthly_remote_cost_limit_usd: 25,
        p_organization_id: "10000000-0000-4000-8000-000000000001",
      });
    },
  );

  it.each(["MEMBER", "VIEWER"] as const)(
    "blocks %s before policy persistence",
    async (role) => {
      mocks.context.mockResolvedValue({ membership: { role } });
      expect(
        await updateOrganizationAIPolicyAction({ status: "idle" }, form()),
      ).toMatchObject({ status: "error" });
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("rejects browser-supplied provider IDs not configured on the server", async () => {
    expect(
      await updateOrganizationAIPolicyAction(
        { status: "idle" },
        form("http://metadata.internal"),
      ),
    ).toMatchObject({ status: "error" });
    expect(mocks.context).not.toHaveBeenCalled();
  });

  it("does not persist schema-invalid policy input", async () => {
    const data = form();
    data.set("executionMode", "UNRESTRICTED");
    expect(
      await updateOrganizationAIPolicyAction(initialAIPolicyActionState, data),
    ).toMatchObject({ status: "error" });
    expect(mocks.context).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
