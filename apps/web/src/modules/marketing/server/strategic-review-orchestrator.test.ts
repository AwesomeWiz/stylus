import { beforeEach, describe, expect, it, vi } from "vitest";

import { AIError } from "@/modules/ai/errors";

import type {
  AudienceResearch,
  BrandReview,
  ChallengeReview,
  ContentStrategy,
  StrategicCouncilReview,
  StrategicReviewContext,
} from "../strategic-review";
import {
  runStrategicReview,
  type StrategicReviewDependencies,
} from "./strategic-review-orchestrator";

const context: StrategicReviewContext = {
  company: {
    audience: { description: "Pre-product startup teams" },
    brand: { toneOfVoice: ["clear", "grounded"] },
    identity: { companyName: "Stylus" },
    marketing: { primaryObjective: "AWARENESS" },
    positioning: { desiredPerception: "credible" },
    problem: { statement: "Startup context is scattered" },
    product: { concept: "A collaborative startup OS" },
  },
  reelBrief: {
    callToAction: "Try one focused workflow.",
    caption: "Keep startup context in one place.",
    critique: {
      audienceFit: { rating: "STRONG", summary: "Relevant" },
      brandFit: { rating: "STRONG", summary: "Aligned" },
      confidence: "HIGH",
      originality: { rating: "ACCEPTABLE", summary: "Distinct" },
      recommendations: [],
      risks: [],
      strengths: ["Clear"],
      verdict: "VIABLE",
      weaknesses: [],
    },
    primaryHook: "Stop losing startup context.",
    schemaVersion: "reel-brief-v1",
    scriptSections: [
      { endSecond: 3, purpose: "Open", script: "Stop.", startSecond: 0 },
    ],
    sourceReelBriefVersionId: "10000000-0000-4000-8000-000000000016",
    sourceReelIdeaId: "20000000-0000-4000-8000-000000000016",
    spokenScript: "Stop losing startup context. Use one focused workflow.",
    title: "Focused workflow — Creative Council",
    versionNumber: 1,
    visualDirections: ["Show the workspace"],
  },
};

const audience: AudienceResearch = {
  assumptions: ["The audience recognizes context fragmentation."],
  audienceFit: "STRONG",
  confidence: "MEDIUM",
  evidenceStatus: "WEAKLY_SUPPORTED",
  findings: [
    {
      basis: "INFERENCE",
      confidence: "MEDIUM",
      evidenceReferences: [
        {
          basis: "EVIDENCE",
          referenceId: "company.audience",
          summary: "Startup teams",
        },
      ],
      finding: "The problem is recognizable.",
      id: "AUD-1",
    },
  ],
  likelyFriction: ["The product mechanism may need one example."],
  likelyResonance: ["Scattered context is a practical pain."],
  recommendations: ["Use one concrete example."],
  summary: "The brief is likely relevant, with one assumption to validate.",
};

const brand: BrandReview = {
  alignedElements: ["Clear tone"],
  brandAlignment: "STRONG",
  confidence: "HIGH",
  conflicts: [],
  evidenceStatus: "SUPPORTED",
  findings: [
    {
      basis: "EVIDENCE",
      confidence: "HIGH",
      evidenceReferences: [
        {
          basis: "EVIDENCE",
          referenceId: "company.brand",
          summary: "Clear and grounded tone",
        },
      ],
      finding: "The language is direct and credible.",
      id: "BRAND-1",
    },
  ],
  recommendedCorrections: [],
  summary: "The brief matches the supplied brand direction.",
  unsupportedOrOverstatedClaims: [],
};

const strategy: ContentStrategy = {
  confidence: "MEDIUM",
  overallRecommendation: "Keep the hook and add one concrete workflow proof.",
  positioningAndAngle: ["Lead with context continuity."],
  priorityChanges: [
    {
      assumptions: [],
      confidence: "HIGH",
      evidenceReferences: [
        {
          basis: "EVIDENCE",
          referenceId: "BRAND-1",
          summary: "Direct tone is aligned.",
        },
      ],
      evidenceStatus: "SUPPORTED",
      id: "REC-1",
      recommendation: "Keep the direct opening.",
      risk: null,
    },
  ],
  risks: ["Audience preference is not externally verified."],
  unchanged: ["Primary hook"],
};

const challenge: ChallengeReview = {
  challenges: [
    {
      category: "MISSING_EVIDENCE",
      challenge: "Audience preference is inferred rather than measured.",
      confidenceCalibration: "Use medium confidence.",
      contradictionReferences: [],
      counterHypothesis: "A narrower audience may need different wording.",
      evidenceStatus: "REQUIRES_EXTERNAL_VERIFICATION",
      missingEvidence: ["Audience response evidence"],
      reconsideration: "RECOMMENDED",
      referenceId: "REC-1",
      riskFlags: ["AUDIENCE_ASSUMPTION"],
      verificationRecommendation: "Validate through an authorized test.",
    },
  ],
  confidence: "HIGH",
  overallSeverity: "MEDIUM",
  summary: "The direction is plausible but audience preference is unverified.",
};

const judge: StrategicCouncilReview = {
  approvedRecommendations: [
    {
      evidenceStatus: "SUPPORTED",
      recommendation: "Keep the direct opening.",
      recommendationId: "REC-1",
    },
  ],
  challengeDispositions: [
    {
      challengeReferenceId: "REC-1",
      disposition: "PARTIALLY_ACCEPTED",
      rationale: "Keep the direction while preserving the verification need.",
    },
  ],
  confidence: "MEDIUM",
  finalAssessment: "Proceed with the grounded direction and test audience fit.",
  rejectedOrRevisedRecommendations: [],
  risks: ["Audience preference remains unverified."],
  unresolvedUnknowns: ["Audience response"],
  verificationNeeds: ["Run an authorized audience test."],
};

const outputs: Record<string, unknown> = {
  marketing_audience_research_v1: audience,
  marketing_brand_review_v1: brand,
  marketing_challenge_review_v1: challenge,
  marketing_content_strategy_v1: strategy,
  marketing_strategic_council_review_v1: judge,
};

interface TestGenerationCall {
  capability: string;
  options: {
    messages: ReadonlyArray<{ content: string; role: string }>;
    signal?: AbortSignal;
    tier?: string;
    timeoutMs?: number;
  };
  parentRunId?: string;
  pluginId?: string;
  schema: { parse(value: unknown): unknown };
  schemaName: string;
}

function dependencies(options?: {
  duplicate?: boolean;
  failAt?: string;
  failure?: Error;
}) {
  const calls: TestGenerationCall[] = [];
  const generate = vi.fn(async (call: TestGenerationCall) => {
    calls.push(call);
    if (call.schemaName === options?.failAt) {
      throw options?.failure ?? new AIError("provider_unavailable");
    }
    const data = call.schema.parse(outputs[call.schemaName]);
    return {
      data,
      estimatedCostUsd: 0,
      finishReason: "stop",
      modelId: "fake-balanced",
      providerId: "fake",
      runId: `30000000-0000-4000-8000-00000000001${calls.length}`,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    };
  });
  const store = {
    complete: vi.fn(async () => ({
      reviewId: "40000000-0000-4000-8000-000000000016",
      runId: "50000000-0000-4000-8000-000000000016",
      versionNumber: 1,
    })),
    fail: vi.fn(async () => undefined),
    record: vi.fn(async () => undefined),
    start: vi.fn(async () => ({
      runId: "50000000-0000-4000-8000-000000000016",
      shouldExecute: !options?.duplicate,
      status: "RUNNING",
    })),
  };
  const deps: StrategicReviewDependencies = {
    generate: generate as unknown as StrategicReviewDependencies["generate"],
    loadContext: vi.fn(async () => context),
    store,
  };
  return { calls, deps, generate, store };
}

const request = {
  actorId: "60000000-0000-4000-8000-000000000016",
  idempotencyKey: "70000000-0000-4000-8000-000000000016",
  organizationId: "80000000-0000-4000-8000-000000000016",
  sourceReelBriefVersionId: context.reelBrief.sourceReelBriefVersionId,
};

describe("Strategic Review orchestration", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("executes exactly Audience -> Brand -> Strategy -> Challenge -> Judge", async () => {
    const test = dependencies();
    await expect(runStrategicReview(request, test.deps)).resolves.toMatchObject(
      {
        duplicate: false,
        status: "SUCCEEDED",
        versionNumber: 1,
      },
    );
    expect(test.generate).toHaveBeenCalledTimes(5);
    expect(test.calls.map((call) => call.schemaName)).toEqual([
      "marketing_audience_research_v1",
      "marketing_brand_review_v1",
      "marketing_content_strategy_v1",
      "marketing_challenge_review_v1",
      "marketing_strategic_council_review_v1",
    ]);
    expect(test.calls.map((call) => call.options.tier)).toEqual([
      "balanced",
      "balanced",
      "reasoning",
      "reasoning",
      "reasoning",
    ]);
    expect(test.calls.every((call) => call.options.timeoutMs === 60_000)).toBe(
      true,
    );
    expect(
      test.calls.every((call) => call.options.signal instanceof AbortSignal),
    ).toBe(true);
    expect(test.calls.every((call) => call.pluginId === "marketing")).toBe(
      true,
    );
    expect(
      test.calls.every(
        (call) => call.capability === "marketing.creative-council.execute",
      ),
    ).toBe(true);
    expect(test.store.record).toHaveBeenCalledTimes(4);
    expect(test.store.complete).toHaveBeenCalledOnce();
    expect(test.store.fail).not.toHaveBeenCalled();
  });

  it.each([
    ["marketing_audience_research_v1", "AUDIENCE", 1, 0],
    ["marketing_brand_review_v1", "BRAND", 2, 1],
    ["marketing_content_strategy_v1", "STRATEGY", 3, 2],
    ["marketing_challenge_review_v1", "CHALLENGE", 4, 3],
    ["marketing_strategic_council_review_v1", "JUDGE", 5, 4],
  ] as const)(
    "stops at %s failure, preserves prior outputs, and creates no final review",
    async (schemaName, stage, callCount, persistedCount) => {
      const test = dependencies({ failAt: schemaName });
      await expect(
        runStrategicReview(request, test.deps),
      ).rejects.toMatchObject({ category: "provider_unavailable" });
      expect(test.generate).toHaveBeenCalledTimes(callCount);
      expect(test.store.record).toHaveBeenCalledTimes(persistedCount);
      expect(test.store.complete).not.toHaveBeenCalled();
      expect(test.store.fail).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "provider_unavailable",
          stage,
        }),
      );
    },
  );

  it.each(["policy_denied", "budget_exceeded", "timeout"] as const)(
    "preserves gateway %s without a Marketing-level retry",
    async (category) => {
      const test = dependencies({
        failAt: "marketing_audience_research_v1",
        failure: new AIError(category),
      });
      await expect(
        runStrategicReview(request, test.deps),
      ).rejects.toMatchObject({ category });
      expect(test.generate).toHaveBeenCalledOnce();
    },
  );

  it("does not execute or persist again for the same invocation", async () => {
    const test = dependencies({ duplicate: true });
    await expect(runStrategicReview(request, test.deps)).resolves.toMatchObject(
      {
        duplicate: true,
        status: "RUNNING",
      },
    );
    expect(test.generate).not.toHaveBeenCalled();
    expect(test.store.record).not.toHaveBeenCalled();
    expect(test.store.complete).not.toHaveBeenCalled();
  });

  it("passes no memory, tools, external research, or competitor material", async () => {
    const test = dependencies();
    await runStrategicReview(request, test.deps);
    const serialized = test.calls
      .flatMap((call) => call.options.messages)
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .join("\n");
    expect(serialized).not.toMatch(
      /knowledge_memories|memoryDomains|agency|competitorEvidence|transcript|sourceUrl|providerUrl/,
    );
    expect(serialized).not.toMatch(/trendResearch|webSearch|toolInput/);
  });
});
