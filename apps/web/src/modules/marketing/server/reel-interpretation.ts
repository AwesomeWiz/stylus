import "server-only";

import { generateAIStructuredForTrustedJob } from "@/core/ai/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import {
  competitorReelAnalysisSchema,
  reelExtractionResultSchema,
} from "../reel-analysis";

const strategicSchema = competitorReelAnalysisSchema.omit({
  visual_metrics: true,
});

export async function interpretCompetitorReel(input: {
  actorId: string;
  analysisId: string;
  extraction: unknown;
  jobId: string;
  organizationId: string;
  reelId: string;
}) {
  const extraction = reelExtractionResultSchema.parse(input.extraction);
  const service = createServiceSupabaseClient();
  const { data: activeJob } = await service
    .from("jobs")
    .select("status")
    .eq("organization_id", input.organizationId)
    .eq("id", input.jobId)
    .eq("status", "RUNNING")
    .maybeSingle();
  if (!activeJob) throw new Error("analysis_cancelled");
  const { data: reel } = await service
    .from("marketing_competitor_reels")
    .select("marketing_competitor_id")
    .eq("organization_id", input.organizationId)
    .eq("id", input.reelId)
    .single();
  if (!reel) throw new Error("reel_not_found");
  const { data: competitor } = await service
    .from("marketing_competitors")
    .select("name, instagram_handle")
    .eq("organization_id", input.organizationId)
    .eq("id", reel.marketing_competitor_id)
    .single();
  if (!competitor) throw new Error("competitor_not_found");
  const transcript = extraction.transcript.text.slice(0, 40_000);
  const result = await generateAIStructuredForTrustedJob({
    actorId: input.actorId,
    capability: "marketing.competitor-reels.analyze",
    jobId: input.jobId,
    options: {
      maxOutputTokens: 1400,
      messages: [
        {
          role: "system",
          content:
            "Analyze only the supplied transcript and deterministic media metrics. You have no frame visibility, OCR, logo, gesture, composition, font, color, or semantic visual evidence. Never infer visual branding. Return concise strategic observations and explicitly include uncertainty in cautions_or_limitations.",
        },
        {
          role: "user",
          content: JSON.stringify({
            competitor: {
              instagramHandle: competitor.instagram_handle,
              name: competitor.name,
            },
            deterministicMedia: {
              averageSceneDuration: extraction.averageSceneDuration,
              cutsPerMinute: extraction.cutsPerMinute,
              durationSeconds: extraction.durationSeconds,
              frameRate: extraction.frameRate,
              height: extraction.height,
              sceneCount: extraction.sceneCount,
              width: extraction.width,
            },
            transcript,
          }),
        },
      ],
      temperature: 0.2,
      tier: "balanced",
      timeoutMs: 90_000,
    },
    organizationId: input.organizationId,
    pluginId: "marketing",
    schema: strategicSchema,
    schemaName: "marketing_competitor_reel_analysis_v1",
  });
  const structured = competitorReelAnalysisSchema.parse({
    ...result.data,
    visual_metrics: {
      aspect_ratio: `${extraction.width}:${extraction.height}`,
      average_scene_duration: extraction.averageSceneDuration,
      cuts_per_minute: extraction.cutsPerMinute,
      resolution: `${extraction.width}x${extraction.height}`,
      scene_count: extraction.sceneCount,
    },
  });
  const { data: stillActive } = await service
    .from("jobs")
    .select("status")
    .eq("organization_id", input.organizationId)
    .eq("id", input.jobId)
    .eq("status", "RUNNING")
    .maybeSingle();
  if (!stillActive) throw new Error("analysis_cancelled");
  const { error } = await service
    .from("marketing_competitor_reel_analyses")
    .update({
      ai_run_id: result.runId,
      completed_at: new Date().toISOString(),
      error_category: null,
      status: "ANALYZED",
      structured_result: structured,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.analysisId)
    .eq("status", "PROCESSING");
  if (error) throw new Error("analysis_persistence_failed");
  await service
    .from("marketing_competitor_reels")
    .update({ processing_status: "ANALYZED" })
    .eq("organization_id", input.organizationId)
    .eq("id", input.reelId);
  return { runId: result.runId };
}
