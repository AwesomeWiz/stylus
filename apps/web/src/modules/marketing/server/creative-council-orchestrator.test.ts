import { beforeEach, describe, expect, it, vi } from "vitest";

import { AIError } from "@/modules/ai/errors";

import type {
  CreativeCouncilContext,
  CreativeCritique,
  HookStrategy,
  ReelScript,
} from "../creative-council";
import {
  runCreativeCouncil,
  type CouncilDependencies,
} from "./creative-council-orchestrator";

const context: CreativeCouncilContext = {
  company: {
    audience: { description: "Early startup teams" },
    brand: { toneOfVoice: ["clear"] },
    identity: { companyName: "Stylus" },
    marketing: { primaryObjective: "AWARENESS" },
    positioning: { difference: "Bounded workflows" },
    problem: { statement: "Scattered startup work" },
    product: { concept: "Startup operating system" },
  },
  competitorEvidence: [],
  reelIdea: {
    callToAction: "Try the workflow",
    concept: "Show a focused planning workflow",
    contentAngle: "Practical demonstration",
    hook: "Stop losing startup decisions",
    notes: null,
    sourceReelIdeaId: "10000000-0000-4000-8000-000000000015",
    status: "READY",
    title: "One clear workflow",
  },
};

const hook: HookStrategy = {
  alternateHooks: ["Your startup context should not disappear."],
  assumptions: ["The audience manages a small startup team."],
  audienceTension: "Important context is scattered across tools.",
  confidence: "HIGH",
  evidenceSummary: "The idea and company positioning support a focused claim.",
  primaryHook: "Stop losing startup decisions between tools.",
  rationale: "It names a familiar operational pain immediately.",
};
const script: ReelScript = {
  callToAction: "Try one bounded workflow today.",
  caption: "Keep startup context connected without adding more noise.",
  chosenHook: hook.primaryHook,
  sections: [
    {
      endSecond: 4,
      purpose: "Open",
      script: hook.primaryHook,
      startSecond: 0,
    },
  ],
  spokenScript:
    "Stop losing startup decisions between tools. Use one clear workflow.",
  visualDirections: ["Show a concise workspace transition."],
};
const critique: CreativeCritique = {
  audienceFit: { rating: "STRONG", summary: "The pain is recognizable." },
  brandFit: { rating: "STRONG", summary: "The tone is clear and practical." },
  confidence: "HIGH",
  originality: {
    rating: "ACCEPTABLE",
    summary: "The framing is differentiated.",
  },
  recommendations: ["Keep the visual transition concrete."],
  risks: ["Avoid implying every tool should be replaced."],
  strengths: ["The hook is specific."],
  verdict: "VIABLE",
  weaknesses: ["The proof point is brief."],
};

function dependencies(options?: {
  duplicate?: boolean;
  failAt?: "HOOK" | "SCRIPT" | "CRITIQUE";
  failure?: AIError;
}) {
  type TestRequest = {
    capability: string;
    options: { tier: string; timeoutMs: number };
    pluginId: string;
    schema: { parse(value: unknown): unknown };
    schemaName: string;
  };
  const calls: TestRequest[] = [];
  const generate = vi.fn(async (input: Record<string, unknown>) => {
    const request = input as TestRequest;
    calls.push(request);
    const stage =
      calls.length === 1 ? "HOOK" : calls.length === 2 ? "SCRIPT" : "CRITIQUE";
    if (options?.failAt === stage)
      throw options.failure ?? new AIError("provider_unavailable");
    const data =
      stage === "HOOK" ? hook : stage === "SCRIPT" ? script : critique;
    return {
      data: request.schema.parse(data),
      estimatedCostUsd: null,
      finishReason: "stop",
      modelId: "fake-model",
      providerId: "fake",
      runId: `70000000-0000-4000-8000-00000000000${calls.length}`,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    };
  }) as unknown as CouncilDependencies["generate"];
  const store = {
    complete: vi.fn(async ({ runId }: { runId: string }) => ({
      briefId: "20000000-0000-4000-8000-000000000015",
      runId,
      versionNumber: 1,
    })),
    fail: vi.fn(async () => undefined),
    record: vi.fn(async () => undefined),
    start: vi.fn(async () => ({
      runId: "30000000-0000-4000-8000-000000000015",
      shouldExecute: !options?.duplicate,
      status: options?.duplicate ? "RUNNING" : "RUNNING",
    })),
  };
  const deps: CouncilDependencies = {
    generate,
    loadContext: vi.fn(async () => context),
    store,
  };
  return { calls, deps, generate, store };
}

const request = {
  actorId: "40000000-0000-4000-8000-000000000015",
  idempotencyKey: "50000000-0000-4000-8000-000000000015",
  organizationId: "60000000-0000-4000-8000-000000000015",
  selectedAnalysisIds: [] as string[],
  sourceReelIdeaId: context.reelIdea.sourceReelIdeaId,
};

describe("Creative Council orchestration", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("executes exactly Hook -> Script -> Critic through three structured gateway calls", async () => {
    const test = dependencies();
    await expect(runCreativeCouncil(request, test.deps)).resolves.toMatchObject(
      {
        duplicate: false,
        status: "SUCCEEDED",
        versionNumber: 1,
      },
    );

    expect(test.generate).toHaveBeenCalledTimes(3);
    expect(test.calls.map((call) => call.schemaName)).toEqual([
      "marketing_hook_strategy_v1",
      "marketing_reel_script_v1",
      "marketing_creative_critique_v1",
    ]);
    expect(test.calls.map((call) => call.options.tier)).toEqual([
      "balanced",
      "balanced",
      "reasoning",
    ]);
    expect(test.calls.map((call) => call.options.timeoutMs)).toEqual([
      90_000, 90_000, 90_000,
    ]);
    expect(
      test.calls.every(
        (call) => call.capability === "marketing.creative-council.execute",
      ),
    ).toBe(true);
    expect(test.calls.every((call) => call.pluginId === "marketing")).toBe(
      true,
    );
    expect(test.store.record).toHaveBeenCalledTimes(2);
    expect(test.store.complete).toHaveBeenCalledOnce();
    expect(test.store.fail).not.toHaveBeenCalled();
  });

  it.each([
    ["HOOK", 1, 0],
    ["SCRIPT", 2, 1],
    ["CRITIQUE", 3, 2],
  ] as const)(
    "stops at %s failure and preserves only earlier successful stages",
    async (stage, callCount, persistedCount) => {
      const test = dependencies({ failAt: stage });
      await expect(
        runCreativeCouncil(request, test.deps),
      ).rejects.toMatchObject({
        category: "provider_unavailable",
      });
      expect(test.generate).toHaveBeenCalledTimes(callCount);
      expect(test.store.record).toHaveBeenCalledTimes(persistedCount);
      expect(test.store.complete).not.toHaveBeenCalled();
      expect(test.store.fail).toHaveBeenCalledWith(
        expect.objectContaining({ category: "provider_unavailable", stage }),
      );
    },
  );

  it.each(["policy_denied", "budget_exceeded", "timeout"] as const)(
    "stops without an application retry when the gateway reports %s",
    async (category) => {
      const test = dependencies({
        failAt: "HOOK",
        failure: new AIError(category),
      });
      await expect(
        runCreativeCouncil(request, test.deps),
      ).rejects.toMatchObject({
        category,
      });
      expect(test.generate).toHaveBeenCalledOnce();
      expect(test.store.complete).not.toHaveBeenCalled();
    },
  );

  it("rejects malformed structured output and does not fabricate later stages", async () => {
    const test = dependencies();
    test.deps.generate = vi.fn(async (input: unknown) => {
      try {
        (input as { schema: { parse(value: unknown): unknown } }).schema.parse({
          incomplete: true,
        });
      } catch (cause) {
        throw new AIError("invalid_response", { cause });
      }
      throw new Error("unreachable");
    }) as CouncilDependencies["generate"];
    await expect(runCreativeCouncil(request, test.deps)).rejects.toMatchObject({
      category: "invalid_response",
    });
    expect(test.deps.generate).toHaveBeenCalledOnce();
    expect(test.store.complete).not.toHaveBeenCalled();
  });

  it("returns the existing run without model calls for a duplicate request", async () => {
    const test = dependencies({ duplicate: true });
    await expect(runCreativeCouncil(request, test.deps)).resolves.toMatchObject(
      {
        duplicate: true,
        status: "RUNNING",
      },
    );
    expect(test.generate).not.toHaveBeenCalled();
    expect(test.store.record).not.toHaveBeenCalled();
    expect(test.store.complete).not.toHaveBeenCalled();
  });
});
