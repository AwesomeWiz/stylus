import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  MarketingCampaignRow,
  MarketingCompetitorRow,
  MarketingCompetitorReelAnalysisRow,
  MarketingCompetitorReelRow,
  MarketingCompetitorReelTranscriptRow,
  MarketingCreativeCouncilEvidenceRow,
  MarketingCreativeCouncilRunRow,
  MarketingCreativeCouncilStageRow,
  MarketingExternalResearchEvidenceRow,
  MarketingExternalResearchReportRow,
  MarketingExternalResearchRunRow,
  MarketingExternalResearchSourceRow,
  MarketingCreativeBriefRow,
  MarketingReelBriefVersionRow,
  MarketingReelIdeaRow,
  MarketingResearchRow,
  MarketingStrategicCouncilReviewVersionRow,
  MarketingStrategicReviewRunRow,
  MarketingStrategicReviewStageRow,
} from "@/lib/supabase/database.types";

async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: unknown }>,
  message: string,
) {
  const { data, error } = await query;
  if (error) throw new Error(message);
  return data ?? [];
}

export async function listMarketingCompetitors(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_competitors")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingCompetitorRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Marketing competitors could not be loaded.",
  );
}

export async function getMarketingCompetitorDetail(
  organizationId: string,
  competitorId: string,
) {
  const db = await createServerSupabaseClient();
  const { data: competitor, error } = await db
    .from("marketing_competitors")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", competitorId)
    .maybeSingle();
  if (error) throw new Error("Marketing competitor could not be loaded.");
  if (!competitor) return null;
  const reels = await rows<MarketingCompetitorReelRow>(
    db
      .from("marketing_competitor_reels")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("marketing_competitor_id", competitorId)
      .order("created_at", { ascending: false }),
    "Competitor Reels could not be loaded.",
  );
  const reelIds = reels.map((reel) => reel.id);
  if (!reelIds.length)
    return { analyses: [], competitor, reels, transcripts: [] };
  const [analyses, transcripts] = await Promise.all([
    rows<MarketingCompetitorReelAnalysisRow>(
      db
        .from("marketing_competitor_reel_analyses")
        .select("*")
        .eq("organization_id", organizationId)
        .in("competitor_reel_id", reelIds)
        .order("analysis_version", { ascending: false }),
      "Reel analyses could not be loaded.",
    ),
    rows<MarketingCompetitorReelTranscriptRow>(
      db
        .from("marketing_competitor_reel_transcripts")
        .select("*")
        .eq("organization_id", organizationId)
        .in("competitor_reel_id", reelIds),
      "Reel transcripts could not be loaded.",
    ),
  ]);
  return { analyses, competitor, reels, transcripts };
}
export async function listMarketingCampaigns(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_campaigns")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingCampaignRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Marketing campaigns could not be loaded.",
  );
}
export async function listMarketingReelIdeas(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_reel_ideas")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingReelIdeaRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Reel ideas could not be loaded.",
  );
}
export async function listMarketingResearch(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_research")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingResearchRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Marketing research could not be loaded.",
  );
}

export async function getExternalResearchHistory(organizationId: string) {
  const db = await createServerSupabaseClient();
  const runs = await rows<MarketingExternalResearchRunRow>(
    db
      .from("marketing_external_research_runs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    "External research history could not be loaded.",
  );
  if (!runs.length) return { evidence: [], reports: [], runs, sources: [] };
  const runIds = runs.map((run) => run.id);
  const [sources, evidence, reports] = await Promise.all([
    rows<MarketingExternalResearchSourceRow>(
      db
        .from("marketing_external_research_sources")
        .select("*")
        .eq("organization_id", organizationId)
        .in("run_id", runIds)
        .order("source_key"),
      "External research sources could not be loaded.",
    ),
    rows<MarketingExternalResearchEvidenceRow>(
      db
        .from("marketing_external_research_evidence")
        .select("*")
        .eq("organization_id", organizationId)
        .in("run_id", runIds)
        .order("evidence_id"),
      "External research evidence could not be loaded.",
    ),
    rows<MarketingExternalResearchReportRow>(
      db
        .from("marketing_external_research_reports")
        .select("*")
        .eq("organization_id", organizationId)
        .in("run_id", runIds),
      "External research reports could not be loaded.",
    ),
  ]);
  return { evidence, reports, runs, sources };
}
export async function listMarketingCreativeBriefs(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_creative_briefs")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingCreativeBriefRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Creative briefs could not be loaded.",
  );
}
export async function listCoreCompetitorOptions(organizationId: string) {
  const db = await createServerSupabaseClient();
  return rows<{ id: string; name: string }>(
    db
      .from("competitors")
      .select("id,name")
      .eq("organization_id", organizationId)
      .order("name"),
    "Core competitors could not be loaded.",
  );
}

export async function listMarketingCampaignOptions(organizationId: string) {
  const db = await createServerSupabaseClient();
  const campaigns = await rows<
    Pick<MarketingCampaignRow, "archived_at" | "id" | "name">
  >(
    db
      .from("marketing_campaigns")
      .select("archived_at,id,name")
      .eq("organization_id", organizationId)
      .order("name"),
    "Marketing campaign options could not be loaded.",
  );
  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: `${campaign.name}${campaign.archived_at ? " (archived)" : ""}`,
  }));
}

export async function getMarketingOverview(organizationId: string) {
  const [campaigns, competitors, ideas, research, briefs] = await Promise.all([
    listMarketingCampaigns(organizationId),
    listMarketingCompetitors(organizationId),
    listMarketingReelIdeas(organizationId),
    listMarketingResearch(organizationId),
    listMarketingCreativeBriefs(organizationId),
  ]);
  return {
    activeCampaigns: campaigns.filter((item) => item.status === "ACTIVE")
      .length,
    briefCount: briefs.length,
    competitorCount: competitors.length,
    ideaCounts: {
      IDEA: ideas.filter((item) => item.status === "IDEA").length,
      DRAFT: ideas.filter((item) => item.status === "DRAFT").length,
      READY: ideas.filter((item) => item.status === "READY").length,
    },
    recentBriefs: briefs.slice(0, 3),
    recentResearch: research.slice(0, 3),
  };
}

export async function getCreativeStudioData(organizationId: string) {
  const db = await createServerSupabaseClient();
  const [ideas, analyses, runs, strategicReviewRuns] = await Promise.all([
    listMarketingReelIdeas(organizationId),
    rows<MarketingCompetitorReelAnalysisRow>(
      db
        .from("marketing_competitor_reel_analyses")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "ANALYZED")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(20),
      "Creative evidence could not be loaded.",
    ),
    rows<MarketingCreativeCouncilRunRow>(
      db
        .from("marketing_creative_council_runs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50),
      "Creative Council history could not be loaded.",
    ),
    rows<MarketingStrategicReviewRunRow>(
      db
        .from("marketing_strategic_review_runs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50),
      "Strategic review history could not be loaded.",
    ),
  ]);

  const reelIds = [
    ...new Set(analyses.map((analysis) => analysis.competitor_reel_id)),
  ];
  const reels = reelIds.length
    ? await rows<MarketingCompetitorReelRow>(
        db
          .from("marketing_competitor_reels")
          .select("*")
          .eq("organization_id", organizationId)
          .is("archived_at", null)
          .in("id", reelIds),
        "Creative evidence Reels could not be loaded.",
      )
    : [];
  const competitorIds = [
    ...new Set(reels.map((reel) => reel.marketing_competitor_id)),
  ];
  const competitors = competitorIds.length
    ? await rows<Pick<MarketingCompetitorRow, "id" | "name">>(
        db
          .from("marketing_competitors")
          .select("id,name")
          .eq("organization_id", organizationId)
          .is("archived_at", null)
          .in("id", competitorIds),
        "Creative evidence competitors could not be loaded.",
      )
    : [];
  const reelById = new Map(reels.map((reel) => [reel.id, reel]));
  const competitorById = new Map(
    competitors.map((competitor) => [competitor.id, competitor]),
  );
  const eligibleEvidence = analyses.flatMap((analysis) => {
    const reel = reelById.get(analysis.competitor_reel_id);
    const competitor = reel
      ? competitorById.get(reel.marketing_competitor_id)
      : null;
    return reel && competitor
      ? [
          {
            analysisId: analysis.id,
            analysisVersion: analysis.analysis_version,
            competitorName: competitor.name,
          },
        ]
      : [];
  });

  const runIds = runs.map((run) => run.id);
  const [stages, evidence, briefs] = runIds.length
    ? await Promise.all([
        rows<MarketingCreativeCouncilStageRow>(
          db
            .from("marketing_creative_council_stages")
            .select("*")
            .eq("organization_id", organizationId)
            .in("council_run_id", runIds)
            .order("created_at", { ascending: true }),
          "Creative Council stages could not be loaded.",
        ),
        rows<MarketingCreativeCouncilEvidenceRow>(
          db
            .from("marketing_creative_council_evidence")
            .select("*")
            .eq("organization_id", organizationId)
            .in("council_run_id", runIds)
            .order("ordinal", { ascending: true }),
          "Creative Council evidence history could not be loaded.",
        ),
        rows<MarketingReelBriefVersionRow>(
          db
            .from("marketing_reel_brief_versions")
            .select("*")
            .eq("organization_id", organizationId)
            .in("council_run_id", runIds)
            .order("created_at", { ascending: false }),
          "Reel Brief versions could not be loaded.",
        ),
      ])
    : [[], [], []];

  const strategicRunIds = strategicReviewRuns.map((run) => run.id);
  const [strategicReviewStages, strategicReviews] = strategicRunIds.length
    ? await Promise.all([
        rows<MarketingStrategicReviewStageRow>(
          db
            .from("marketing_strategic_review_stages")
            .select("*")
            .eq("organization_id", organizationId)
            .in("strategic_review_run_id", strategicRunIds)
            .order("created_at", { ascending: true }),
          "Strategic review stages could not be loaded.",
        ),
        rows<MarketingStrategicCouncilReviewVersionRow>(
          db
            .from("marketing_strategic_council_review_versions")
            .select("*")
            .eq("organization_id", organizationId)
            .in("strategic_review_run_id", strategicRunIds)
            .order("created_at", { ascending: false }),
          "Strategic Council Review versions could not be loaded.",
        ),
      ])
    : [[], []];

  return {
    briefs,
    eligibleEvidence,
    evidence,
    ideas,
    runs,
    stages,
    strategicReviewRuns,
    strategicReviewStages,
    strategicReviews,
  };
}
