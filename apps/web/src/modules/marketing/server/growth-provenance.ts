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
    .limit(6);
  if (links.error) throw Error("Provenance could not load.");
  const ids = [...new Set((links.data ?? []).map((l) => l.experiment_id))];
  const experiments = ids.length
    ? await db
        .from("marketing_experiments")
        .select(
          "id,title,hypothesis_id,status,evaluated_source_ids,archived_at",
        )
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
  const seenHypotheses = new Set<string>();
  for (const experiment of experiments.data ?? []) {
    result.push({
      label: "Experiment",
      title: experiment.title + (experiment.archived_at ? " · Archived" : ""),
      href: `/apps/marketing/experiments?item=${experiment.id}`,
    });
    const hypothesis = hypotheses.data?.find(
      (h) => h.id === experiment.hypothesis_id,
    );
    if (hypothesis && !seenHypotheses.has(hypothesis.id)) {
      seenHypotheses.add(hypothesis.id);
      result.push({
        label: "Based on Hypothesis",
        title: hypothesis.title + (hypothesis.archived_at ? " · Archived" : ""),
        href: `/apps/marketing/hypotheses?item=${hypothesis.id}`,
      });
    }
  }
  // One batched explicit source read. Completed experiments retain their exact
  // evaluation source IDs, even when today's Hypothesis has different sources.
  if (hypothesisIds.length) {
    const completedIds = [
        ...new Set(
          (experiments.data ?? []).flatMap((e) =>
            e.status === "COMPLETE" ? (e.evaluated_source_ids ?? []) : [],
          ),
        ),
      ],
      liveHypotheses = [
        ...new Set(
          (experiments.data ?? []).flatMap((e) =>
            e.status !== "COMPLETE" && e.hypothesis_id ? [e.hypothesis_id] : [],
          ),
        ),
      ],
      columns =
        "id,hypothesis_id,evidence_id,evidence_run_id,evidence_key,archived_at";
    const [frozen, current] = await Promise.all([
      completedIds.length
        ? db
            .from("marketing_hypothesis_sources")
            .select(columns)
            .eq("organization_id", org)
            .in("id", completedIds)
            .order("id")
            .limit(180)
        : Promise.resolve({ data: [], error: null }),
      liveHypotheses.length
        ? db
            .from("marketing_hypothesis_sources")
            .select(columns)
            .eq("organization_id", org)
            .in("hypothesis_id", liveHypotheses)
            .is("archived_at", null)
            .order("id")
            .limit(180)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (frozen.error || current.error)
      throw Error("Evidence provenance could not load.");
    const eligible = [
      ...new Map(
        [...(frozen.data ?? []), ...(current.data ?? [])].map((s) => [s.id, s]),
      ).values(),
    ]
      .filter((s) => s.evidence_id)
      .slice(0, 6);
    if (eligible.length) {
      const evidence = await db
        .from("marketing_external_research_evidence")
        .select("id,title,run_id,evidence_id")
        .eq("organization_id", org)
        .in(
          "id",
          eligible.flatMap((s) => (s.evidence_id ? [s.evidence_id] : [])),
        );
      if (evidence.error) throw Error("Evidence provenance could not load.");
      const seen = new Set<string>();
      for (const source of eligible) {
        const row = evidence.data?.find(
          (e) =>
            e.id === source.evidence_id &&
            e.run_id === source.evidence_run_id &&
            e.evidence_id === source.evidence_key,
        );
        if (row && !seen.has(row.id)) {
          seen.add(row.id);
          result.push({
            label: "Based on Evidence",
            title:
              (row.title ?? row.evidence_id).slice(0, 160) +
              " · " +
              row.evidence_id,
            href: `/apps/marketing/research?section=evidence&run=${row.run_id}&evidence=${row.id}#${row.run_id}-${row.evidence_id}`,
          });
        }
      }
    }
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
