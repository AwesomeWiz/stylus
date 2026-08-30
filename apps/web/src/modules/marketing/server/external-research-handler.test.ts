import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  retrieve: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/core/ai/server", () => ({
  generateAIStructuredForTrustedJob: mocks.generate,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                created_by: "00000000-0000-4000-8000-000000000002",
                organization_id: "00000000-0000-4000-8000-000000000003",
                request_snapshot: request,
              },
              error: null,
            }),
          }),
        }),
      }),
    }),
    rpc: mocks.rpc,
  }),
}));
vi.mock("./research-adapter-registry", () => ({
  researchSourceAdapterRegistry: { retrieve: mocks.retrieve },
}));

import { runExternalResearchJob } from "./external-research-handler";

const request = {
  hackerNewsStream: "top",
  objective: "AUDIENCE_PAINS",
  queryTerms: ["startup"],
  question: "What pain points recur for startup teams?",
  rssFeedUrls: [],
};
const report = {
  confidence: "MEDIUM",
  disagreements: [],
  findings: [
    {
      confidence: "MEDIUM",
      id: "F-1",
      statement: "Onboarding recurs.",
      supportedBy: ["EVID-1"],
    },
  ],
  freshnessAssessment: "Current at retrieval time.",
  inferences: [],
  limitations: [],
  partialFailureWarnings: [],
  patterns: [],
  recommendations: [],
  summary: "Onboarding is a recurring concern.",
  unresolvedQuestions: [],
};

describe("external research job handler", () => {
  beforeEach(() => {
    mocks.generate.mockReset();
    mocks.retrieve.mockReset();
    mocks.rpc.mockReset();
    mocks.rpc.mockImplementation(async (name: string) => ({
      data:
        name === "complete_marketing_external_research"
          ? "00000000-0000-4000-8000-000000000005"
          : null,
      error: null,
    }));
  });

  it("persists deterministic evidence and performs exactly one trusted synthesis", async () => {
    mocks.retrieve.mockResolvedValue({ failures: [], items: [item()] });
    mocks.generate.mockResolvedValue({
      data: report,
      runId: "00000000-0000-4000-8000-000000000004",
    });
    const result = await runExternalResearchJob(
      { runId: "00000000-0000-4000-8000-000000000001" },
      jobContext(),
    );
    expect(result).toMatchObject({ evidenceCount: 1 });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: "marketing.external-research.execute",
        pluginId: "marketing",
      }),
    );
    const modelMessage =
      mocks.generate.mock.calls[0]?.[0].options.messages[1]?.content;
    expect(() => JSON.parse(modelMessage)).not.toThrow();
    expect(modelMessage.length).toBeLessThanOrEqual(24_000);
    const retrieval = mocks.rpc.mock.calls.find(
      ([name]) => name === "record_marketing_external_research_retrieval",
    )?.[1];
    expect(retrieval.p_evidence).toEqual([
      expect.objectContaining({ evidenceId: "EVID-1", sourceKey: "SRC-1" }),
    ]);
  });

  it("records partial source failure while synthesizing retained evidence once", async () => {
    mocks.retrieve.mockResolvedValue({
      failures: [
        {
          adapterId: "hacker-news",
          canonicalUrl: null,
          category: "timeout",
          diagnosticCategory: "timeout",
          metadata: { stream: "top" },
        },
      ],
      items: [item()],
    });
    mocks.generate.mockResolvedValue({
      data: report,
      runId: "00000000-0000-4000-8000-000000000004",
    });
    await runExternalResearchJob(
      { runId: "00000000-0000-4000-8000-000000000001" },
      jobContext(),
    );
    const retrieval = mocks.rpc.mock.calls.find(
      ([name]) => name === "record_marketing_external_research_retrieval",
    )?.[1];
    expect(retrieval).toMatchObject({
      p_partial: true,
      p_warning_categories: ["timeout"],
    });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it("fails retrieval without invoking AI when no evidence remains", async () => {
    mocks.retrieve.mockResolvedValue({
      failures: [
        {
          adapterId: "hacker-news",
          canonicalUrl: null,
          category: "transient_failure",
          diagnosticCategory: "connection_failure",
          metadata: { stream: "top" },
        },
      ],
      items: [],
    });
    await expect(
      runExternalResearchJob(
        { runId: "00000000-0000-4000-8000-000000000001" },
        jobContext(),
      ),
    ).rejects.toMatchObject({ category: "permanent_failure" });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "fail_marketing_external_research",
      expect.objectContaining({ p_failure_stage: "retrieval" }),
    );
  });

  it("persists zero query matches as a successful source observation and skips synthesis", async () => {
    mocks.retrieve.mockResolvedValue({
      emptyResults: [
        {
          adapterId: "hacker-news",
          canonicalUrl: "https://news.ycombinator.com/top",
          diagnosticCategory: "zero_matching_candidates",
          metadata: {
            candidateCount: 20,
            eligibleCandidateCount: 20,
            matchingCandidateCount: 0,
            stream: "top",
          },
        },
      ],
      failures: [],
      items: [],
    });
    await expect(
      runExternalResearchJob(
        { runId: "00000000-0000-4000-8000-000000000001" },
        jobContext(),
      ),
    ).rejects.toMatchObject({ category: "permanent_failure" });
    const retrieval = mocks.rpc.mock.calls.find(
      ([name]) => name === "record_marketing_external_research_retrieval",
    )?.[1];
    expect(retrieval.p_sources).toEqual([
      expect.objectContaining({
        failureCategory: null,
        safeMetadata: expect.objectContaining({
          diagnosticCategory: "zero_matching_candidates",
          matchingCandidateCount: 0,
        }),
        status: "SUCCEEDED",
      }),
    ]);
    expect(retrieval.p_warning_categories).toContain(
      "zero_matching_candidates",
    );
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("retains persisted evidence and creates no report after synthesis failure", async () => {
    mocks.retrieve.mockResolvedValue({ failures: [], items: [item()] });
    mocks.generate.mockRejectedValue(new Error("provider detail"));
    await expect(
      runExternalResearchJob(
        { runId: "00000000-0000-4000-8000-000000000001" },
        jobContext(),
      ),
    ).rejects.toMatchObject({ category: "validation_failed" });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "record_marketing_external_research_retrieval",
      expect.any(Object),
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "fail_marketing_external_research",
      expect.objectContaining({ p_failure_stage: "synthesis" }),
    );
    expect(
      mocks.rpc.mock.calls.some(
        ([name]) => name === "complete_marketing_external_research",
      ),
    ).toBe(false);
  });
});

function item() {
  return {
    adapterId: "hacker-news",
    author: "founder",
    canonicalUrl: "https://news.ycombinator.com/item?id=1",
    contentHash: "a".repeat(64),
    fetchedAt: "2026-08-29T00:00:00.000Z",
    metadata: { stream: "top" },
    nativeId: "1",
    normalizedText: "Startup onboarding is painful.",
    publishedAt: "2026-08-28T00:00:00.000Z",
    title: "Onboarding",
  };
}

function jobContext() {
  return {
    actorId: "00000000-0000-4000-8000-000000000002",
    attempt: 1,
    heartbeat: async () => undefined,
    isCancellationRequested: async () => false,
    jobId: "00000000-0000-4000-8000-000000000006",
    organizationId: "00000000-0000-4000-8000-000000000003",
    origin: { kind: "plugin" as const, pluginId: "marketing" },
    reportProgress: async () => undefined,
    signal: new AbortController().signal,
  };
}
