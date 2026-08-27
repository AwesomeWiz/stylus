import { z } from "zod";

export const MAX_REEL_BYTES = 100 * 1024 * 1024;
export const MAX_REEL_DURATION_SECONDS = 180;
export const REEL_EXTRACTION_VERSION = "ffmpeg-whisper-v1";

export const transcriptSegmentSchema = z
  .object({
    end: z.number().min(0).max(MAX_REEL_DURATION_SECONDS),
    start: z.number().min(0).max(MAX_REEL_DURATION_SECONDS),
    text: z.string().trim().min(1).max(1000),
  })
  .strict()
  .refine((segment) => segment.end >= segment.start, "Invalid segment range");

export const transcriptSchema = z
  .object({
    durationSeconds: z.number().min(0).max(MAX_REEL_DURATION_SECONDS),
    engine: z.literal("faster-whisper"),
    language: z.string().min(2).max(20).nullable(),
    model: z.string().min(1).max(100),
    segments: z.array(transcriptSegmentSchema).max(500),
    text: z.string().trim().min(1).max(100_000),
  })
  .strict();

export const reelExtractionResultSchema = z
  .object({
    averageSceneDuration: z.number().min(0).max(MAX_REEL_DURATION_SECONDS),
    cutsPerMinute: z.number().min(0).max(1000),
    durationSeconds: z.number().positive().max(MAX_REEL_DURATION_SECONDS),
    extractionVersion: z.literal(REEL_EXTRACTION_VERSION),
    frameRate: z.number().positive().max(1000),
    height: z.number().int().positive().max(16_384),
    sceneCount: z.number().int().min(0).max(20),
    sceneTimestamps: z.array(z.number().min(0).max(180)).max(20),
    transcript: transcriptSchema,
    width: z.number().int().positive().max(16_384),
  })
  .strict();

export const scriptSectionSchema = z
  .object({
    label: z.enum(["HOOK", "SETUP", "VALUE", "PAYOFF", "CTA", "OTHER"]),
    observation: z.string().trim().min(1).max(1000),
  })
  .strict();

export const competitorReelAnalysisSchema = z
  .object({
    call_to_action: z.string().trim().max(1000),
    cautions_or_limitations: z.array(z.string().trim().min(1).max(500)).max(10),
    content_angle: z.string().trim().min(1).max(1000),
    hook_explanation: z.string().trim().min(1).max(1500),
    hook_type: z.string().trim().min(1).max(120),
    key_messages: z.array(z.string().trim().min(1).max(500)).max(12),
    pacing_analysis: z.string().trim().min(1).max(1500),
    primary_hook: z.string().trim().min(1).max(1000),
    reusable_patterns: z.array(z.string().trim().min(1).max(500)).max(12),
    script_structure: z.array(scriptSectionSchema).max(12),
    summary: z.string().trim().min(1).max(2000),
    transcript_pattern_observations: z
      .array(z.string().trim().min(1).max(500))
      .max(12),
    visual_metrics: z
      .object({
        aspect_ratio: z.string().max(40),
        average_scene_duration: z.number().min(0).max(180),
        cuts_per_minute: z.number().min(0).max(1000),
        resolution: z.string().max(40),
        scene_count: z.number().int().min(0).max(20),
      })
      .strict(),
  })
  .strict();

export type CompetitorReelAnalysis = z.infer<
  typeof competitorReelAnalysisSchema
>;
export type ReelExtractionResult = z.infer<typeof reelExtractionResultSchema>;
