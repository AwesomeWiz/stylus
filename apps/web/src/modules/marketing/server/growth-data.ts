import "server-only";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
import { entitySearchPattern } from "@/core/entities/public";
import { getBoardEntityRegistry } from "@/plugins";
import { findCompanyMemoryCreation } from "@/core/memory/server";
import {
  growthLinkColumn,
  growthLinkKinds,
  growthRoutes,
  hypothesisStatuses,
  experimentStatuses,
  type GrowthKind,
  type HypothesisSource,
  type GrowthRow,
  type HypothesisSourceRow,
  type ExperimentLinkRow,
} from "../growth";

export const growthTables = {
  hypothesis: "marketing_hypotheses",
  experiment: "marketing_experiments",
  learning: "marketing_learnings",
} as const;
export type GrowthChoice = {
  id: string;
  title: string;
  detail: string;
  href: string;
  source?: HypothesisSource;
  archived?: boolean;
};
export type GrowthList = {
  rows: Pick<
    GrowthRow,
    | "id"
    | "title"
    | "status"
    | "confidence"
    | "owner_id"
    | "archived_at"
    | "updated_at"
  >[];
  counts: { id: string; source_count: number; experiment_count: number }[];
  hasMore: boolean;
  cursor?: string;
  after?: string;
  query: string;
  status: string;
  archived: boolean;
};
async function scope() {
  const { context } = await requireEnabledPlugin("marketing");
  return {
    context,
    db: await createServerSupabaseClient(),
    org: context.organization.id,
  };
}
function checked<T>(
  result: { data: T | null; error: unknown },
  message = "Growth records could not load.",
): T {
  if (result.error || result.data === null) throw Error(message);
  return result.data;
}
const registryContext = (
  context: Awaited<ReturnType<typeof scope>>["context"],
) => ({
  organizationId: context.organization.id,
  actorId: context.user.id,
  role: context.membership.role,
  enabledPlugins: new Set(["marketing"]),
});
export async function getGrowthList(
  kind: GrowthKind,
  params: Record<string, string | undefined>,
): Promise<GrowthList> {
  const { db, org } = await scope(),
    query = (params.query ?? "").trim().slice(0, 100),
    archived = params.archived === "true";
  const statuses =
    kind === "hypothesis"
      ? hypothesisStatuses
      : kind === "experiment"
        ? experimentStatuses
        : [];
  const status = statuses.find((s) => s === params.status) ?? "";
  const columns =
    kind === "hypothesis"
      ? "id,title,status,confidence,owner_id,updated_at,archived_at"
      : kind === "experiment"
        ? "id,title,status,owner_id,updated_at,archived_at"
        : "id,title,confidence,updated_at,archived_at";
  let request = db
    .from(growthTables[kind])
    .select(columns)
    .eq("organization_id", org)
    .ilike("title", entitySearchPattern(query))
    .order("id")
    .limit(26);
  request = archived
    ? request.not("archived_at", "is", null)
    : request.is("archived_at", null);
  if (status) request = request.eq("status", status);
  if (z.uuid().safeParse(params.after).success)
    request = request.gt("id", params.after!);
  const result = checked(await request) as unknown as GrowthList["rows"],
    rows = result.slice(0, 25);
  const counts =
    kind === "hypothesis" && rows.length
      ? checked(
          await db.rpc("marketing_growth_counts", {
            p_organization_id: org,
            p_ids: rows.map((r) => r.id),
          }),
        )
      : [];
  return {
    after: z.uuid().safeParse(params.after).success ? params.after : undefined,
    rows,
    counts,
    hasMore: result.length > 25,
    cursor: rows.at(-1)?.id,
    query,
    status,
    archived,
  };
}
export type GrowthDetail = {
  record: GrowthRow;
  hypothesis: GrowthRow | null;
  experiment: GrowthRow | null;
  sources: { row: HypothesisSourceRow; choice: GrowthChoice }[];
  links: {
    row: ExperimentLinkRow;
    choice: GrowthChoice;
    kind: (typeof growthLinkKinds)[number];
  }[];
  experiments: GrowthRow[];
  learning: GrowthRow | null;
  memory: { id: string; title: string; archived_at: string | null } | null;
};
export async function getGrowthDetail(
  kind: GrowthKind,
  id: string,
): Promise<GrowthDetail | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { db, org, context } = await scope();
  const result = await db
    .from(growthTables[kind])
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw Error("Selected record could not load.");
  if (!result.data) return null;
  const record = result.data;
  let experiment: GrowthRow | null = kind === "experiment" ? record : null,
    hypothesis: GrowthRow | null = kind === "hypothesis" ? record : null;
  if (kind === "learning" && record.experiment_id) {
    const r = await db
      .from("marketing_experiments")
      .select("*")
      .eq("organization_id", org)
      .eq("id", record.experiment_id)
      .maybeSingle();
    if (r.error) throw Error("Provenance could not load.");
    experiment = r.data;
  }
  if (experiment?.hypothesis_id) {
    const r = await db
      .from("marketing_hypotheses")
      .select("*")
      .eq("organization_id", org)
      .eq("id", experiment.hypothesis_id)
      .maybeSingle();
    if (r.error) throw Error("Hypothesis could not load.");
    hypothesis = r.data;
  }
  let sourceQuery = db
    .from("marketing_hypothesis_sources")
    .select("*")
    .eq("organization_id", org)
    .eq("hypothesis_id", hypothesis?.id ?? id);
  if (experiment?.status === "COMPLETE")
    sourceQuery = sourceQuery.in("id", experiment.evaluated_source_ids ?? []);
  else sourceQuery = sourceQuery.is("archived_at", null);
  const sourceRows = checked(await sourceQuery.order("id").limit(30));
  const [evidence, notes, reports] = await Promise.all([
    sourceRows.some((s) => s.evidence_id)
      ? db
          .from("marketing_external_research_evidence")
          .select(
            "id,title,run_id,evidence_id,evidence_type,source_id,canonical_url,published_at,fetched_at,created_at",
          )
          .eq("organization_id", org)
          .in(
            "id",
            sourceRows.flatMap((s) => (s.evidence_id ? [s.evidence_id] : [])),
          )
      : Promise.resolve({ data: [], error: null }),
    sourceRows.some((s) => s.note_id)
      ? db
          .from("marketing_research")
          .select("id,title,archived_at")
          .eq("organization_id", org)
          .in(
            "id",
            sourceRows.flatMap((s) => (s.note_id ? [s.note_id] : [])),
          )
      : Promise.resolve({ data: [], error: null }),
    sourceRows.some((s) => s.opportunity_report_id)
      ? db
          .from("marketing_external_research_reports")
          .select("id,run_id,structured_report")
          .eq("organization_id", org)
          .in(
            "id",
            sourceRows.flatMap((s) =>
              s.opportunity_report_id ? [s.opportunity_report_id] : [],
            ),
          )
      : Promise.resolve({ data: [], error: null }),
  ]);
  const evidenceRows = checked(evidence),
    noteRows = checked(notes),
    reportRows = checked(reports);
  const sources = sourceRows.map((row) => {
    const ev = evidenceRows.find(
        (e) =>
          e.id === row.evidence_id &&
          e.run_id === row.evidence_run_id &&
          e.evidence_id === row.evidence_key,
      ),
      note = noteRows.find((n) => n.id === row.note_id),
      report = reportRows.find((r) => r.id === row.opportunity_report_id),
      candidate = opportunity(report?.structured_report, row.opportunity_index);
    const choice: GrowthChoice = ev
      ? {
          id: ev.id,
          title: ev.title ?? ev.evidence_id,
          detail: `${ev.evidence_id} · ${ev.evidence_type} · Source ${ev.source_id} · Retrieved ${ev.fetched_at ?? ev.created_at}${ev.published_at ? " · Published " + ev.published_at : ""}`,
          href: `/apps/marketing/research?section=evidence&run=${ev.run_id}&evidence=${ev.id}#${ev.run_id}-${ev.evidence_id}`,
          source: {
            kind: "evidence",
            id: ev.id,
            runId: ev.run_id,
            evidenceKey: ev.evidence_id,
          },
        }
      : note
        ? {
            id: note.id,
            title: note.title,
            detail: note.archived_at
              ? "Archived manual Research Note"
              : "Manual Research Note",
            href: `/apps/marketing/research?section=notes&item=${note.id}${note.archived_at ? "&archived=true" : ""}`,
            source: { kind: "note", id: note.id },
            archived: !!note.archived_at,
          }
        : report && candidate
          ? {
              id: report.id,
              title: candidate.title,
              detail: `Content Opportunity candidate ${row.opportunity_index! + 1} · exact report`,
              href: `/apps/marketing/research?section=reports&run=${report.run_id}#opportunity-${report.run_id}-${row.opportunity_index}`,
              source: {
                kind: "opportunity",
                id: report.id,
                index: row.opportunity_index!,
              },
            }
          : {
              id: row.id,
              title: "Source unavailable",
              detail: "No accessible source projection",
              href: "",
            };
    return { row, choice };
  });
  const rawLinks = experiment
    ? checked(
        await db
          .from("marketing_experiment_links")
          .select("*")
          .eq("organization_id", org)
          .eq("experiment_id", experiment.id)
          .is("archived_at", null)
          .order("id")
          .limit(50),
      )
    : [];
  const links = await resolveExecutionLinks(rawLinks, context);
  const experiments =
    hypothesis && kind === "hypothesis"
      ? checked(
          await db
            .from("marketing_experiments")
            .select("*")
            .eq("organization_id", org)
            .eq("hypothesis_id", hypothesis.id)
            .order("updated_at", { ascending: false })
            .limit(25),
        )
      : [];
  const learningResult = experiment
    ? await db
        .from("marketing_learnings")
        .select("*")
        .eq("organization_id", org)
        .eq("experiment_id", experiment.id)
        .maybeSingle()
    : null;
  if (learningResult?.error) throw Error("Learning could not load.");
  const learning =
    kind === "learning" ? record : (learningResult?.data ?? null);
  const memory = learning
    ? await findCompanyMemoryCreation("marketing.learning:" + learning.id)
    : null;
  return {
    record,
    hypothesis,
    experiment,
    sources,
    links,
    experiments,
    learning,
    memory: memory
      ? { id: memory.id, title: memory.title, archived_at: memory.archived_at }
      : null,
  };
}
function opportunity(
  report: unknown,
  index: number | null | undefined,
): { title: string } | null {
  if (
    typeof report !== "object" ||
    !report ||
    !("contentOpportunities" in report) ||
    !Array.isArray(report.contentOpportunities) ||
    index == null
  )
    return null;
  const value: unknown = report.contentOpportunities[index];
  return typeof value === "object" &&
    value &&
    "title" in value &&
    typeof value.title === "string"
    ? { title: value.title.slice(0, 160) }
    : null;
}
async function resolveExecutionLinks(
  rows: ExperimentLinkRow[],
  context: Awaited<ReturnType<typeof scope>>["context"],
) {
  if (!rows.length) return [];
  const registry = await getBoardEntityRegistry(),
    ctx = registryContext(context);
  const simple = {
    task: "core.task",
    campaign: "marketing.campaign",
    "reel-idea": "marketing.reel-idea",
    "creative-brief": "marketing.creative-brief",
  } as const;
  const refs = rows.flatMap((row) =>
    Object.entries(simple).flatMap(([kind, entityType]) => {
      const id = row[growthLinkColumn[kind as keyof typeof simple]];
      return id
        ? [
            {
              organizationId: ctx.organizationId,
              entityId: id,
              entityType,
              ...(entityType.startsWith("marketing.")
                ? { sourcePlugin: "marketing" }
                : {}),
            },
          ]
        : [];
    }),
  );
  const projections = await registry.resolve(ctx, refs);
  const specials = await specialExecutionChoices(rows, ctx.organizationId);
  return rows.map((row) => {
    const kind = growthLinkKinds.find((k) => !!row[growthLinkColumn[k]])!,
      id = row[growthLinkColumn[kind]]!,
      resolved = projections.find((p) => p.reference.entityId === id);
    const choice: GrowthChoice =
      resolved?.status === "available"
        ? {
            id,
            title: resolved.projection.title,
            detail: [
              kind,
              resolved.projection.status,
              resolved.projection.archived ? "Archived" : null,
            ]
              .filter(Boolean)
              .join(" · "),
            href: resolved.projection.href,
            archived: resolved.projection.archived,
          }
        : (specials.get(id) ?? {
            id,
            title: "Linked item unavailable",
            detail: kind,
            href: "",
          });
    return { row, kind, choice };
  });
}
async function specialExecutionChoices(rows: ExperimentLinkRow[], org: string) {
  const db = await createServerSupabaseClient(),
    out = new Map<string, GrowthChoice>();
  const [briefs, snapshots, learnings] = await Promise.all([
    rows.some((r) => r.reel_brief_version_id)
      ? db
          .from("marketing_reel_brief_versions")
          .select("id,title,version_number")
          .eq("organization_id", org)
          .in(
            "id",
            rows.flatMap((r) =>
              r.reel_brief_version_id ? [r.reel_brief_version_id] : [],
            ),
          )
      : Promise.resolve({ data: [], error: null }),
    rows.some((r) => r.performance_snapshot_id)
      ? db
          .from("marketing_performance_snapshots")
          .select("id,published_content_id,observed_at,views,reach,saves")
          .eq("organization_id", org)
          .in(
            "id",
            rows.flatMap((r) =>
              r.performance_snapshot_id ? [r.performance_snapshot_id] : [],
            ),
          )
      : Promise.resolve({ data: [], error: null }),
    rows.some((r) => r.performance_learning_id)
      ? db
          .from("marketing_performance_learnings")
          .select(
            "id,summary,observation_horizon,sample_count,evidence_strength",
          )
          .eq("organization_id", org)
          .in(
            "id",
            rows.flatMap((r) =>
              r.performance_learning_id ? [r.performance_learning_id] : [],
            ),
          )
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const b of checked(briefs))
    out.set(b.id, {
      id: b.id,
      title: b.title,
      detail: `Immutable Reel Brief · version ${b.version_number}`,
      href: `/apps/marketing/creative-studio?brief=${b.id}`,
    });
  for (const s of checked(snapshots))
    out.set(s.id, {
      id: s.id,
      title: "Performance Snapshot",
      detail: `Observed ${s.observed_at} · Views ${s.views ?? "unavailable"} · Reach ${s.reach ?? "unavailable"} · Saves ${s.saves ?? "unavailable"}`,
      href: `/apps/marketing/performance?snapshot=${s.id}#snapshot-${s.id}`,
    });
  for (const l of checked(learnings))
    out.set(l.id, {
      id: l.id,
      title: l.summary.slice(0, 160),
      detail: `Deterministic Performance Learning · ${l.observation_horizon} · n=${l.sample_count} · ${l.evidence_strength}`,
      href: `/apps/marketing/performance?learning=${l.id}#learning-${l.id}`,
    });
  return out;
}
const choiceInput = z
  .object({
    kind: z.enum([
      "hypothesis",
      "evidence",
      "note",
      "opportunity",
      ...growthLinkKinds,
    ]),
    query: z.string().trim().max(100).default(""),
    cursor: z.string().max(80).optional(),
  })
  .strict();
export async function findGrowthChoices(
  input: unknown,
): Promise<{ items: GrowthChoice[]; hasMore: boolean; cursor?: string }> {
  const v = choiceInput.parse(input),
    { context, db, org } = await scope();
  if (v.kind === "hypothesis") {
    let q = db
      .from("marketing_hypotheses")
      .select("id,title,statement,status")
      .eq("organization_id", org)
      .is("archived_at", null)
      .ilike("title", entitySearchPattern(v.query))
      .order("id")
      .limit(26);
    if (v.cursor) q = q.gt("id", z.uuid().parse(v.cursor));
    const rows = checked(await q);
    return {
      items: rows.slice(0, 25).map((r) => ({
        id: r.id,
        title: r.title,
        detail: r.status ?? "",
        href: `${growthRoutes.hypothesis}?item=${r.id}`,
      })),
      hasMore: rows.length > 25,
      cursor: rows.slice(0, 25).at(-1)?.id,
    };
  }
  if (
    [
      "task",
      "campaign",
      "reel-idea",
      "creative-brief",
      "evidence",
      "note",
    ].includes(v.kind)
  ) {
    const types: Record<string, string> = {
      task: "core.task",
      campaign: "marketing.campaign",
      "reel-idea": "marketing.reel-idea",
      "creative-brief": "marketing.creative-brief",
      evidence: "marketing.research-evidence",
      note: "marketing.research-note",
    };
    const registry = await getBoardEntityRegistry(),
      provider = registry.available(registryContext(context), types[v.kind]!);
    if (!provider?.search) throw Error("Record category unavailable.");
    const result = await provider.search(
      registryContext(context),
      v.query,
      v.cursor ? z.uuid().parse(v.cursor) : undefined,
    );
    const resolved = await registry.resolve(
      registryContext(context),
      result.items.map((r) => r.reference),
    );
    return {
      items: resolved.flatMap((r) =>
        r.status === "available"
          ? [
              {
                id: r.reference.entityId,
                title: r.projection.title,
                detail: [r.projection.status, r.projection.summary]
                  .filter(Boolean)
                  .join(" · "),
                href: r.projection.href,
                ...(v.kind === "evidence"
                  ? {
                      source: {
                        kind: "evidence" as const,
                        id: r.reference.entityId,
                        runId: r.reference.immutable!.runId,
                        evidenceKey: r.reference.immutable!.evidenceId,
                      },
                    }
                  : v.kind === "note"
                    ? {
                        source: {
                          kind: "note" as const,
                          id: r.reference.entityId,
                        },
                      }
                    : {}),
              },
            ]
          : [],
      ),
      hasMore: result.hasMore,
      cursor: result.items.at(-1)?.reference.entityId,
    };
  }
  if (v.kind === "opportunity") {
    let q = db
      .from("marketing_external_research_reports")
      .select("id,run_id,structured_report")
      .eq("organization_id", org)
      .order("id")
      .limit(7);
    if (v.cursor) q = q.gt("id", z.uuid().parse(v.cursor));
    const reports = checked(await q),
      items: GrowthChoice[] = [];
    for (const report of reports.slice(0, 6))
      for (let i = 0; i < 4; i++) {
        const c = opportunity(report.structured_report, i);
        if (c && c.title.toLowerCase().includes(v.query.toLowerCase()))
          items.push({
            id: report.id + ":" + i,
            title: c.title,
            detail: "Content Opportunity candidate · exact report",
            href: `/apps/marketing/research?section=reports&run=${report.run_id}#opportunity-${report.run_id}-${i}`,
            source: { kind: "opportunity", id: report.id, index: i },
          });
      }
    return {
      items,
      hasMore: reports.length > 6,
      cursor: reports.slice(0, 6).at(-1)?.id,
    };
  }
  if (
    v.kind !== "reel-brief" &&
    v.kind !== "snapshot" &&
    v.kind !== "performance-learning"
  )
    throw Error("Invalid record category.");
  const column = growthLinkColumn[v.kind];
  let rows: ExperimentLinkRow[] = [];
  if (v.kind === "reel-brief") {
    let q = db
      .from("marketing_reel_brief_versions")
      .select("id")
      .eq("organization_id", org)
      .ilike("title", entitySearchPattern(v.query))
      .order("id")
      .limit(26);
    if (v.cursor) q = q.gt("id", z.uuid().parse(v.cursor));
    const ids = checked(await q);
    rows = ids.map((r) => ({ [column]: r.id }) as ExperimentLinkRow);
  } else if (v.kind === "snapshot") {
    if (v.query && !z.uuid().safeParse(v.query).success)
      return { items: [], hasMore: false };
    let q = db
      .from("marketing_performance_snapshots")
      .select("id")
      .eq("organization_id", org)
      .order("id")
      .limit(26);
    if (v.query) q = q.eq("id", v.query);
    if (v.cursor) q = q.gt("id", z.uuid().parse(v.cursor));
    rows = checked(await q).map(
      (r) => ({ [column]: r.id }) as ExperimentLinkRow,
    );
  } else {
    let q = db
      .from("marketing_performance_learnings")
      .select("id")
      .eq("organization_id", org)
      .ilike("summary", entitySearchPattern(v.query))
      .order("id")
      .limit(26);
    if (v.cursor) q = q.gt("id", z.uuid().parse(v.cursor));
    rows = checked(await q).map(
      (r) => ({ [column]: r.id }) as ExperimentLinkRow,
    );
  }
  const choices = await specialExecutionChoices(rows.slice(0, 25), org);
  return {
    items: [...choices.values()],
    hasMore: rows.length > 25,
    cursor: rows.slice(0, 25).at(-1)?.[column] ?? undefined,
  };
}

export async function getGrowthOverview() {
  const { db, org } = await scope();
  const [experiments, hypotheses, learnings, evidence, campaigns, snapshots] =
    await Promise.all([
      db
        .from("marketing_experiments")
        .select("id,title,status,ends_on,owner_id,success_criteria")
        .eq("organization_id", org)
        .is("archived_at", null)
        .in("status", ["PLANNED", "RUNNING", "EVALUATING"])
        .order("ends_on", { nullsFirst: false })
        .limit(8),
      db
        .from("marketing_hypotheses")
        .select("id,title,status")
        .eq("organization_id", org)
        .is("archived_at", null)
        .in("status", ["DRAFT", "READY_TO_TEST"])
        .order("updated_at", { ascending: false })
        .limit(6),
      db
        .from("marketing_learnings")
        .select("id,title,confidence")
        .eq("organization_id", org)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      db
        .from("marketing_external_research_evidence")
        .select("id,run_id,evidence_id,title,evidence_type")
        .eq("organization_id", org)
        .order("created_at", { ascending: false })
        .limit(5),
      db
        .from("marketing_campaigns")
        .select("id,name,status,ends_on")
        .eq("organization_id", org)
        .is("archived_at", null)
        .in("status", ["PLANNING", "ACTIVE"])
        .order("ends_on", { nullsFirst: false })
        .limit(5),
      db
        .from("marketing_performance_snapshots")
        .select("id,observed_at,views,reach,saves")
        .eq("organization_id", org)
        .order("observed_at", { ascending: false })
        .limit(5),
    ]);
  return {
    experiments: checked(experiments),
    hypotheses: checked(hypotheses),
    learnings: checked(learnings),
    evidence: checked(evidence),
    campaigns: checked(campaigns),
    snapshots: checked(snapshots),
  };
}
