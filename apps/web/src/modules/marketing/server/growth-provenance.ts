import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  EntityContext,
  EntityProvenanceLink,
} from "@/core/entities/public";

/** Called by the public composition host after canonical target resolution. */
export async function marketingExecutionProvenance(
  context: EntityContext,
  entityType: string,
  entityId: string,
): Promise<EntityProvenanceLink[]> {
  if (!context.enabledPlugins.has("marketing")) return [];
  const columns = {
    "core.task": "task_id",
    "marketing.campaign": "campaign_id",
    "marketing.reel-idea": "reel_idea_id",
    "marketing.creative-brief": "creative_brief_id",
  } as const;
  const column = columns[entityType as keyof typeof columns];
  if (!column) return [];
  const db = await createServerSupabaseClient(),
    org = context.organizationId;
  const links = await db
    .from("marketing_experiment_links")
    .select("experiment_id")
    .eq("organization_id", org)
    .eq(column, entityId)
    .is("archived_at", null)
    .order("id")
    .limit(20);
  if (links.error) throw Error("Provenance could not load.");
  const ids = [...new Set((links.data ?? []).map((l) => l.experiment_id))];
  const experiments = ids.length
    ? await db
        .from("marketing_experiments")
        .select("id,title,hypothesis_id,archived_at")
        .eq("organization_id", org)
        .in("id", ids)
    : { data: [], error: null };
  if (experiments.error) throw Error("Experiments could not load.");
  const hypothesisIds = [
    ...new Set(
      (experiments.data ?? []).flatMap((e) =>
        e.hypothesis_id ? [e.hypothesis_id] : [],
      ),
    ),
  ];
  const hypotheses = hypothesisIds.length
    ? await db
        .from("marketing_hypotheses")
        .select("id,title,archived_at")
        .eq("organization_id", org)
        .in("id", hypothesisIds)
    : { data: [], error: null };
  if (hypotheses.error) throw Error("Hypotheses could not load.");
  const result: EntityProvenanceLink[] = [];
  for (const experiment of experiments.data ?? []) {
    result.push({
      label: "Experiment",
      title: experiment.title + (experiment.archived_at ? " · Archived" : ""),
      href: `/apps/marketing/experiments?item=${experiment.id}`,
    });
    const hypothesis = hypotheses.data?.find(
      (h) => h.id === experiment.hypothesis_id,
    );
    if (hypothesis)
      result.push({
        label: "Based on Hypothesis",
        title: hypothesis.title + (hypothesis.archived_at ? " · Archived" : ""),
        href: `/apps/marketing/hypotheses?item=${hypothesis.id}`,
      });
  }
  if (entityType === "marketing.reel-idea") {
    const idea = await db
      .from("marketing_reel_ideas")
      .select("campaign_id")
      .eq("organization_id", org)
      .eq("id", entityId)
      .maybeSingle();
    if (idea.error) throw Error("Campaign context could not load.");
    if (idea.data?.campaign_id) {
      const campaign = await db
        .from("marketing_campaigns")
        .select("id,name,archived_at")
        .eq("organization_id", org)
        .eq("id", idea.data.campaign_id)
        .maybeSingle();
      if (campaign.error) throw Error("Campaign context could not load.");
      if (campaign.data)
        result.push({
          label: "Campaign",
          title:
            campaign.data.name +
            (campaign.data.archived_at ? " · Archived" : ""),
          href: `/apps/marketing/campaigns?item=${campaign.data.id}`,
        });
    }
  }
  return result;
}
