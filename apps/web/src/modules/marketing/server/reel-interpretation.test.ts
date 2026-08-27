import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  service: vi.fn(),
}));

vi.mock("@/core/ai/server", () => ({
  generateAIStructuredForTrustedJob: mocks.generate,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: mocks.service,
}));

import { interpretCompetitorReel } from "./reel-interpretation";

const extraction = {
  averageSceneDuration: 2.5,
  cutsPerMinute: 24,
  durationSeconds: 10,
  extractionVersion: "ffmpeg-whisper-cpp-v1" as const,
  frameRate: 30,
  height: 1920,
  sceneCount: 4,
  sceneTimestamps: [0, 2.5, 5, 7.5],
  transcript: {
    durationSeconds: 10,
    engine: "whisper.cpp" as const,
    language: "en",
    model: "small.en",
    segments: [{ end: 2, start: 0, text: "A practical opening hook." }],
    text: "A practical opening hook followed by useful supporting detail.",
  },
  width: 1080,
};

const strategicResult = {
  call_to_action: "Invite the audience to try the method.",
  cautions_or_limitations: [
    "The analysis uses transcript and media metrics only.",
  ],
  content_angle: "Practical education",
  hook_explanation: "The opening promises an immediately useful outcome.",
  hook_type: "Outcome-led",
  key_messages: ["Make the first seconds useful."],
  pacing_analysis: "Short scenes support a brisk delivery.",
  primary_hook: "Learn a practical method quickly.",
  reusable_patterns: ["Lead with a specific outcome."],
  script_structure: [
    { label: "HOOK" as const, observation: "Outcome promise" },
  ],
  summary: "A concise educational Reel.",
  transcript_pattern_observations: [
    "The transcript moves from promise to detail.",
  ],
};

function createService() {
  const updates: Array<{ table: string; value: unknown }> = [];
  let jobReadCount = 0;
  const service = {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = { error: null };
      chain.eq = vi.fn(() => chain);
      chain.select = vi.fn(() => chain);
      chain.update = vi.fn((value: unknown) => {
        updates.push({ table, value });
        return chain;
      });
      chain.maybeSingle = vi.fn(async () => {
        if (table === "jobs") {
          jobReadCount += 1;
          return { data: { status: "RUNNING" }, error: null };
        }
        return { data: null, error: null };
      });
      chain.single = vi.fn(async () => {
        if (table === "marketing_competitor_reels") {
          return {
            data: { marketing_competitor_id: "competitor-1" },
            error: null,
          };
        }
        return {
          data: { instagram_handle: "example", name: "Example competitor" },
          error: null,
        };
      });
      return chain;
    }),
  };
  return { jobReadCount: () => jobReadCount, service, updates };
}

describe("competitor Reel interpretation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes a persisted extraction through the trusted ModelGateway lifecycle", async () => {
    const database = createService();
    mocks.service.mockReturnValue(database.service);
    mocks.generate.mockResolvedValue({
      data: strategicResult,
      runId: "ai-run-1",
    });

    await expect(
      interpretCompetitorReel({
        actorId: "actor-1",
        analysisId: "analysis-1",
        extraction,
        jobId: "job-1",
        organizationId: "organization-1",
        reelId: "reel-1",
      }),
    ).resolves.toEqual({ runId: "ai-run-1" });

    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "actor-1",
        capability: "marketing.competitor-reels.analyze",
        jobId: "job-1",
        organizationId: "organization-1",
        pluginId: "marketing",
        schemaName: "marketing_competitor_reel_analysis_v1",
      }),
    );
    expect(database.jobReadCount()).toBe(2);
    expect(database.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "marketing_competitor_reel_analyses",
          value: expect.objectContaining({
            ai_run_id: "ai-run-1",
            status: "ANALYZED",
          }),
        }),
        {
          table: "marketing_competitor_reels",
          value: { processing_status: "ANALYZED" },
        },
      ]),
    );
  });

  it("does not persist structured analysis when trusted AI execution fails", async () => {
    const database = createService();
    mocks.service.mockReturnValue(database.service);
    mocks.generate.mockRejectedValue(new Error("provider_unavailable"));

    await expect(
      interpretCompetitorReel({
        actorId: "actor-1",
        analysisId: "analysis-1",
        extraction,
        jobId: "job-1",
        organizationId: "organization-1",
        reelId: "reel-1",
      }),
    ).rejects.toThrow("provider_unavailable");

    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(database.updates).toEqual([]);
  });
});
