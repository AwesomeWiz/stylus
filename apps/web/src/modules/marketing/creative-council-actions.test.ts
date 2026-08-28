import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  revalidatePath: vi.fn(),
  run: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("./server/creative-council-orchestrator", () => ({
  runCreativeCouncil: mocks.run,
}));

import { AIError } from "@/modules/ai/errors";

import { runCreativeCouncilAction } from "./creative-council-actions";
import { initialCreativeCouncilActionState } from "./creative-council";

const organizationId = "10000000-0000-4000-8000-000000000015";
const actorId = "20000000-0000-4000-8000-000000000015";
const ideaId = "30000000-0000-4000-8000-000000000015";
const analysisId = "40000000-0000-4000-8000-000000000015";
const idempotencyKey = "50000000-0000-4000-8000-000000000015";

function form() {
  const value = new FormData();
  value.set("sourceReelIdeaId", ideaId);
  value.set("idempotencyKey", idempotencyKey);
  value.append("selectedAnalysisId", analysisId);
  value.set("organizationId", "forged-organization");
  value.set("actorId", "forged-actor");
  value.set("providerId", "forged-provider");
  value.set("modelId", "forged-model");
  value.set("providerUrl", "http://metadata.internal");
  return value;
}

describe("Creative Council Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({
      membership: { role: "MEMBER" },
      organization: { id: organizationId },
      user: { id: actorId },
    });
    mocks.run.mockResolvedValue({
      duplicate: false,
      runId: "60000000-0000-4000-8000-000000000015",
      status: "SUCCEEDED",
    });
  });

  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "allows %s using only server-derived organization and actor authority",
    async (role) => {
      mocks.context.mockResolvedValue({
        membership: { role },
        organization: { id: organizationId },
        user: { id: actorId },
      });
      await expect(
        runCreativeCouncilAction(initialCreativeCouncilActionState, form()),
      ).resolves.toMatchObject({ status: "success" });
      expect(mocks.run).toHaveBeenCalledWith({
        actorId,
        idempotencyKey,
        organizationId,
        selectedAnalysisIds: [analysisId],
        sourceReelIdeaId: ideaId,
      });
      expect(JSON.stringify(mocks.run.mock.calls[0])).not.toMatch(
        /forged|metadata\.internal/,
      );
    },
  );

  it("denies VIEWER before any AI execution", async () => {
    mocks.context.mockResolvedValue({
      membership: { role: "VIEWER" },
      organization: { id: organizationId },
      user: { id: actorId },
    });
    await expect(
      runCreativeCouncilAction(initialCreativeCouncilActionState, form()),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("rejects malformed and over-bounded browser input before execution", async () => {
    const value = form();
    value.delete("sourceReelIdeaId");
    await expect(
      runCreativeCouncilAction(initialCreativeCouncilActionState, value),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.context).not.toHaveBeenCalled();
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("returns a normalized safe AI failure without provider internals", async () => {
    mocks.run.mockRejectedValue(
      new AIError("policy_denied", {
        diagnostic: "sensitive internal diagnostic",
      }),
    );
    const result = await runCreativeCouncilAction(
      initialCreativeCouncilActionState,
      form(),
    );
    expect(result).toEqual({
      message: "The organization AI policy does not allow this request.",
      status: "error",
    });
    expect(JSON.stringify(result)).not.toMatch(/sensitive|providerUrl|stack/);
  });
});
