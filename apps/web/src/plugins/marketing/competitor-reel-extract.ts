import { defineJob, z } from "@/core/jobs/public";

export const competitorReelExtractJob = defineJob({
  capability: "marketing.competitor-reels.analyze",
  concurrencyGroup: "marketing.competitor-reel.extract",
  description:
    "Extract bounded media metadata and transcript for a competitor Reel.",
  executionClass: "EXTERNAL_WORKER",
  hostedExecutionSupported: false,
  id: "marketing.competitor-reel.extract",
  idempotency: "REQUIRED",
  inputSchema: z.object({ analysisId: z.uuid(), reelId: z.uuid() }).strict(),
  maxAttempts: 3,
  origin: { kind: "plugin", pluginId: "marketing" },
  outputSchema: z
    .object({
      analysisId: z.uuid(),
      durationSeconds: z.number().positive().max(180),
      extractionVersion: z.literal("ffmpeg-whisper-cpp-v1"),
      reelId: z.uuid(),
    })
    .strict(),
  priority: 60,
  retryableCategories: ["transient_failure", "internal_error", "timeout"],
  sideEffect: "IDEMPOTENT_WRITE",
  timeoutMs: 15 * 60 * 1000,
});
