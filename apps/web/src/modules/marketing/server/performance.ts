import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type {
  MarketingPerformanceLearningEvidenceRow,
  MarketingPerformanceLearningRow,
  MarketingPerformanceSnapshotRow,
  MarketingPublishedContentRow,
  MarketingReelBriefVersionRow,
} from "@/lib/supabase/database.types";

import {
  derivePerformanceLearningCandidates,
  PERFORMANCE_LIMITS,
} from "../performance-learning";

async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: unknown }>,
  message: string,
) {
  const { data, error } = await query;
  if (error) throw new Error(message);
  return data ?? [];
}

export async function getPerformanceWorkspaceData(organizationId: string) {
  const db = await createServerSupabaseClient();
  const [contents, snapshots, learnings, evidence, briefs] = await Promise.all([
    rows<MarketingPublishedContentRow>(
      db
        .from("marketing_published_content")
        .select("*")
        .eq("organization_id", organizationId)
        .order("published_at", { ascending: false })
        .limit(PERFORMANCE_LIMITS.contents),
      "Published content could not be loaded.",
    ),
    rows<MarketingPerformanceSnapshotRow>(
      db
        .from("marketing_performance_snapshots")
        .select("*")
        .eq("organization_id", organizationId)
        .order("observed_at", { ascending: false })
        .limit(PERFORMANCE_LIMITS.snapshots),
      "Performance snapshots could not be loaded.",
    ),
    rows<MarketingPerformanceLearningRow>(
      db
        .from("marketing_performance_learnings")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100),
      "Performance learnings could not be loaded.",
    ),
    rows<MarketingPerformanceLearningEvidenceRow>(
      db
        .from("marketing_performance_learning_evidence")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(2_000),
      "Performance learning provenance could not be loaded.",
    ),
    rows<MarketingReelBriefVersionRow>(
      db
        .from("marketing_reel_brief_versions")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100),
      "Reel Brief versions could not be loaded.",
    ),
  ]);
  return { briefs, contents, evidence, learnings, snapshots };
}

export async function deriveAndPersistPerformanceLearnings(input: {
  actorId: string;
  organizationId: string;
}) {
  const data = await getPerformanceWorkspaceData(input.organizationId);
  const candidates = derivePerformanceLearningCandidates(data);
  const service = createServiceSupabaseClient();
  let createdCount = 0;
  for (const candidate of candidates) {
    const { data: learningId, error } = await service.rpc(
      "create_marketing_performance_learning",
      {
        p_actor_id: input.actorId,
        p_caveats: candidate.caveats,
        p_content_type: "REEL",
        p_evidence: candidate.evidence.map((item) => ({
          evidence_role: item.evidenceRole,
          snapshot_id: item.snapshotId,
        })),
        p_horizon: candidate.horizon,
        p_metric: "SAVE_RATE_BY_REACH",
        p_organization_id: input.organizationId,
        p_platform: "INSTAGRAM",
        p_subject_value: candidate.subjectValue,
        p_summary: candidate.summary,
      },
    );
    if (error) throw new Error("Performance learning could not be persisted.");
    if (learningId) createdCount += 1;
  }
  return { candidateCount: candidates.length, createdCount };
}
