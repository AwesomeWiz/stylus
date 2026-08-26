import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGateway: vi.fn(),
  enabledPluginIds: vi.fn(),
  gatewayText: vi.fn(),
  getContext: vi.fn(),
  getPolicy: vi.fn(),
  getSpend: vi.fn(),
}));

vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("@/modules/plugins/server/data", () => ({
  getEnabledOrganizationPluginIds: mocks.enabledPluginIds,
}));
vi.mock("./data", () => ({
  getOrganizationAIPolicy: mocks.getPolicy,
  getOrganizationMonthlyRemoteSpend: mocks.getSpend,
}));
vi.mock("./configured", () => ({
  createConfiguredModelGateway: mocks.createGateway,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({})),
}));

import { generateAIText } from "./execution";

const realOrganizationId = "10000000-0000-4000-8000-000000000001";
const realActorId = "00000000-0000-4000-8000-000000000001";

describe("trusted AI execution context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockResolvedValue({
      membership: { removed_at: null, role: "MEMBER" },
      organization: { id: realOrganizationId },
      user: { id: realActorId },
    });
    mocks.getPolicy.mockResolvedValue({
      allowed_provider_ids: ["ollama"],
      default_tier: "FAST",
      execution_mode: "LOCAL_ONLY",
      monthly_remote_cost_limit_usd: null,
    });
    mocks.enabledPluginIds.mockResolvedValue([]);
    mocks.getSpend.mockResolvedValue(0);
    mocks.gatewayText.mockResolvedValue({ text: "ok" });
    mocks.createGateway.mockReturnValue({ generateText: mocks.gatewayText });
  });

  it("derives organization, actor, and run ID instead of accepting caller fields", async () => {
    await generateAIText({
      actorId: "forged-actor",
      capability: "core.ai.test",
      options: { messages: [{ content: "hello", role: "user" }] },
      organizationId: "forged-organization",
      runId: "forged-run",
    } as Parameters<typeof generateAIText>[0]);
    expect(mocks.gatewayText).toHaveBeenCalledOnce();
    const request = mocks.gatewayText.mock.calls[0]![0];
    expect(request.context).toMatchObject({
      actorId: realActorId,
      organizationId: realOrganizationId,
      pluginId: null,
    });
    expect(request.context.runId).not.toBe("forged-run");
    expect(request.context.runId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("rejects missing and removed membership contexts before provider setup", async () => {
    mocks.getContext.mockResolvedValueOnce(null);
    await expect(
      generateAIText({
        capability: "core.ai.test",
        options: { messages: [{ content: "hello", role: "user" }] },
      }),
    ).rejects.toMatchObject({ category: "policy_denied" });
    mocks.getContext.mockResolvedValueOnce({
      membership: { removed_at: "2026-08-26T00:00:00Z", role: "MEMBER" },
      organization: { id: realOrganizationId },
      user: { id: realActorId },
    });
    await expect(
      generateAIText({
        capability: "core.ai.test",
        options: { messages: [{ content: "hello", role: "user" }] },
      }),
    ).rejects.toMatchObject({ category: "policy_denied" });
    expect(mocks.createGateway).not.toHaveBeenCalled();
  });
});
