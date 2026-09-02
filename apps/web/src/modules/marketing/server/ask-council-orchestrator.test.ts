import { describe, expect, it, vi } from "vitest";

import { AIError } from "@/modules/ai/errors";

import type { AskCouncilDependencies } from "./ask-council-orchestrator";
import { runAskCouncil } from "./ask-council-orchestrator";

const context = {
  company: {
    audience: null,
    brand: null,
    identity: null,
    marketing: null,
    positioning: null,
    problem: null,
    product: null,
  },
  companyModelReferenceId: "CTX-COMPANY-1" as const,
  history: [],
  performance: [],
  reelBrief: null,
  research: [],
  strategicReview: null,
};

const request = {
  conversationId: null,
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  intent: "AUTO" as const,
  performanceLearningIds: [],
  question: "What direction should our marketing take next?",
  reelBriefVersionId: null,
  researchReportId: null,
  strategicReviewId: null,
};

function dependencies(options?: {
  failSpecialist?: boolean;
  invalidReference?: boolean;
  synthesisFailure?: boolean;
}) {
  let call = 0;
  const generate = vi.fn(
    async (input: Parameters<AskCouncilDependencies["generate"]>[0]) => {
      call += 1;
      if (
        options?.failSpecialist &&
        input.schemaName.includes("content_strategist")
      )
        throw new AIError("provider_unavailable");
      if (
        options?.synthesisFailure &&
        input.schemaName === "marketing_ask_council_answer_v1"
      )
        throw new AIError("invalid_response");
      const data =
        input.schemaName === "marketing_ask_council_answer_v1"
          ? {
              answer: "Use one evidence-bounded direction.",
              disagreements: [],
              keyRecommendations: ["Test a focused direction."],
              suggestedNextSteps: ["Review the recommendation."],
              supportingReferenceIds: options?.invalidReference
                ? ["PERF-99"]
                : ["CTX-COMPANY-1"],
              uncertainties: [],
            }
          : {
              assumptions: [],
              perspective: "The available company context is limited.",
              recommendation: "Start with one bounded test.",
              risks: [],
              suggestedNextStep: "Define the test.",
              supportingReferenceIds: ["CTX-COMPANY-1"],
              uncertainty: "No external evidence was attached.",
            };
      return {
        data,
        runId: `00000000-0000-4000-8000-${String(call).padStart(12, "0")}`,
      } as never;
    },
  );
  const store = {
    complete: vi.fn(async () => ({
      assistantMessageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      turnId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    })),
    fail: vi.fn(async () => undefined),
    recordSpecialist: vi.fn(async () => undefined),
    start: vi.fn(async () => ({
      conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      shouldExecute: true,
      status: "PENDING" as "PENDING" | "SUCCEEDED" | "FAILED",
      turnId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      userMessageId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    })),
  };
  return {
    deps: {
      generate: generate as AskCouncilDependencies["generate"],
      loadContext: vi.fn(async () => ({ context, references: [] })),
      store,
    } satisfies AskCouncilDependencies,
    generate,
    store,
  };
}

describe("Ask Council orchestration", () => {
  it("runs the deterministic specialist set plus exactly one ModelGateway synthesis", async () => {
    const fixture = dependencies();
    await expect(
      runAskCouncil(
        { actorId: "actor", organizationId: "org", request },
        fixture.deps,
      ),
    ).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect(fixture.generate).toHaveBeenCalledTimes(3);
    for (const [call] of fixture.generate.mock.calls) {
      expect(call.capability).toBe("marketing.ask-council.execute");
      expect(call.pluginId).toBe("marketing");
      expect(call.options.tier).toBe("balanced");
      expect(call).not.toHaveProperty("tools");
    }
    expect(
      fixture.generate.mock.calls.filter(
        ([call]) => call.schemaName === "marketing_ask_council_answer_v1",
      ),
    ).toHaveLength(1);
    expect(fixture.store.recordSpecialist).toHaveBeenCalledTimes(2);
    expect(fixture.store.complete).toHaveBeenCalledTimes(1);
    expect(fixture.store.fail).not.toHaveBeenCalled();
  });

  it("fails the turn deterministically when any specialist fails and does not synthesize", async () => {
    const fixture = dependencies({ failSpecialist: true });
    await expect(
      runAskCouncil(
        { actorId: "actor", organizationId: "org", request },
        fixture.deps,
      ),
    ).rejects.toMatchObject({ category: "provider_unavailable" });
    expect(fixture.generate).toHaveBeenCalledTimes(2);
    expect(fixture.store.complete).not.toHaveBeenCalled();
    expect(fixture.store.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        failedSpecialistId: "marketing.content-strategist",
      }),
    );
  });

  it("persists no successful answer when final synthesis fails", async () => {
    const fixture = dependencies({ synthesisFailure: true });
    await expect(
      runAskCouncil(
        { actorId: "actor", organizationId: "org", request },
        fixture.deps,
      ),
    ).rejects.toMatchObject({ category: "invalid_response" });
    expect(fixture.store.recordSpecialist).toHaveBeenCalledTimes(2);
    expect(fixture.store.complete).not.toHaveBeenCalled();
    expect(fixture.store.fail).toHaveBeenCalledTimes(1);
  });

  it("rejects invented references after gateway output", async () => {
    const fixture = dependencies({ invalidReference: true });
    await expect(
      runAskCouncil(
        { actorId: "actor", organizationId: "org", request },
        fixture.deps,
      ),
    ).rejects.toMatchObject({ category: "unknown" });
    expect(fixture.store.complete).not.toHaveBeenCalled();
    expect(fixture.store.fail).toHaveBeenCalledTimes(1);
  });

  it("returns duplicate state without any ModelGateway call", async () => {
    const fixture = dependencies();
    fixture.store.start.mockResolvedValueOnce({
      conversationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      shouldExecute: false,
      status: "SUCCEEDED",
      turnId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      userMessageId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });
    await expect(
      runAskCouncil(
        { actorId: "actor", organizationId: "org", request },
        fixture.deps,
      ),
    ).resolves.toMatchObject({ duplicate: true, status: "SUCCEEDED" });
    expect(fixture.generate).not.toHaveBeenCalled();
  });
});
