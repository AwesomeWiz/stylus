import { describe, expect, it } from "vitest";

import {
  competitorReelAnalysisSchema,
  reelExtractionResultSchema,
} from "./reel-analysis";

const extraction = {
  averageSceneDuration: 2,
  cutsPerMinute: 30,
  durationSeconds: 30,
  extractionVersion: "ffmpeg-whisper-v1",
  frameRate: 30,
  height: 1920,
  sceneCount: 15,
  sceneTimestamps: [2, 4],
  transcript: {
    durationSeconds: 30,
    engine: "faster-whisper",
    language: "en",
    model: "base",
    segments: [{ end: 2, start: 0, text: "Start now" }],
    text: "Start now",
  },
  width: 1080,
};

describe("competitor Reel analysis schemas", () => {
  it("accepts bounded deterministic extraction and transcript data", () => {
    expect(reelExtractionResultSchema.parse(extraction)).toEqual(extraction);
  });
  it("rejects over-duration media and unbounded segments", () => {
    expect(
      reelExtractionResultSchema.safeParse({
        ...extraction,
        durationSeconds: 181,
      }).success,
    ).toBe(false);
    expect(
      reelExtractionResultSchema.safeParse({
        ...extraction,
        sceneTimestamps: Array(21).fill(1),
      }).success,
    ).toBe(false);
  });
  it("requires every versioned strategic field and deterministic visual metrics", () => {
    const result = competitorReelAnalysisSchema.safeParse({
      summary: "Incomplete",
    });
    expect(result.success).toBe(false);
    expect(Object.keys(competitorReelAnalysisSchema.shape)).toEqual(
      expect.arrayContaining([
        "summary",
        "primary_hook",
        "hook_type",
        "hook_explanation",
        "script_structure",
        "content_angle",
        "key_messages",
        "call_to_action",
        "pacing_analysis",
        "transcript_pattern_observations",
        "reusable_patterns",
        "cautions_or_limitations",
        "visual_metrics",
      ]),
    );
  });
});
