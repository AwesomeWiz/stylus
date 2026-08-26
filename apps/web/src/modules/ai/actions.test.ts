import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configuredProviders: vi.fn(() => ["ollama", "openai-compatible"]),
  context: vi.fn(),
  generateAIText: vi.fn(),
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
vi.mock("./server/execution", () => ({
  generateAIText: mocks.generateAIText,
}));

import { AIError } from "./errors";
import {
  testAIConnectionAction,
  updateOrganizationAIPolicyAction,
} from "./actions";
import {
  initialAIConnectionTestActionState,
  initialAIPolicyActionState,
} from "./schemas";

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
    mocks.generateAIText.mockResolvedValue({
      estimatedCostUsd: 0,
      finishReason: "stop",
      modelId: "ollama-default",
      providerId: "ollama",
      runId: "20000000-0000-4000-8000-000000000001",
      text: "Private provider response",
      usage: { inputTokens: 4, outputTokens: 1, totalTokens: 5 },
    });
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

describe("AI connection diagnostic action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the trusted fixed Core request and returns safe metadata only", async () => {
    mocks.generateAIText.mockResolvedValue({
      estimatedCostUsd: 0,
      finishReason: "stop",
      modelId: "ollama-default",
      providerId: "ollama",
      runId: "20000000-0000-4000-8000-000000000001",
      text: "Private provider response",
      usage: { inputTokens: 4, outputTokens: 1, totalTokens: 5 },
    });
    const forged = new FormData();
    forged.set("organizationId", "forged-organization");
    forged.set("actorId", "forged-actor");
    forged.set("providerUrl", "http://metadata.internal");
    forged.set("providerId", "forged-provider");
    forged.set("modelId", "forged-model");
    forged.set("pluginId", "forged-plugin");

    const result = await testAIConnectionAction(
      initialAIConnectionTestActionState,
      forged,
    );

    expect(mocks.generateAIText).toHaveBeenCalledWith({
      capability: "core.ai.connection-test",
      options: {
        maxOutputTokens: 8,
        messages: [{ content: "Reply exactly OK.", role: "user" }],
        temperature: 0,
        tier: "fast",
        timeoutMs: 15_000,
      },
    });
    expect(result).toEqual({
      durationMs: expect.any(Number),
      message: "AI connection succeeded.",
      modelId: "ollama-default",
      providerId: "ollama",
      status: "success",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /Private provider response|Reply exactly OK|forged|metadata\.internal|runId|usage/,
    );
  });

  it.each(["provider_unavailable", "policy_denied"] as const)(
    "returns a normalized safe %s failure",
    async (category) => {
      mocks.generateAIText.mockRejectedValue(new AIError(category));
      const result = await testAIConnectionAction(
        initialAIConnectionTestActionState,
        new FormData(),
      );
      expect(result).toMatchObject({
        durationMs: expect.any(Number),
        errorCategory: category,
        status: "error",
      });
      expect(JSON.stringify(result)).not.toMatch(
        /stack|cause|prompt|response/i,
      );
    },
  );
});
