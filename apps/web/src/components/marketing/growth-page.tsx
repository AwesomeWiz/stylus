import { z } from "zod";
import { MarketingPage } from "./marketing-page";
import { GrowthWorkspace } from "./growth-workspace";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getGrowthDetail,
  getGrowthList,
  type GrowthChoice,
} from "@/modules/marketing/server/growth-data";
import { growthRoutes, type GrowthKind } from "@/modules/marketing/growth";

export async function GrowthPage({
  kind,
  searchParams,
}: {
  kind: GrowthKind;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { context } = await requireEnabledPlugin("marketing"),
    params = await searchParams,
    db = await createServerSupabaseClient(),
    org = context.organization.id;
  const [list, detail, members] = await Promise.all([
    getGrowthList(kind, params),
    params.item ? getGrowthDetail(kind, params.item) : null,
    db.rpc("list_organization_task_members", { p_organization_id: org }),
  ]);
  if (members.error) throw Error("Workspace members could not load.");
  let hypothesis: GrowthChoice | null = null,
    source: GrowthChoice | null = null;
  if (params.create === "1" && z.uuid().safeParse(params.hypothesis).success) {
    const result = await db
      .from("marketing_hypotheses")
      .select("id,title,status")
      .eq("organization_id", org)
      .eq("id", params.hypothesis!)
      .is("archived_at", null)
      .maybeSingle();
    if (result.error) throw Error("Hypothesis could not load.");
    if (result.data)
      hypothesis = {
        id: result.data.id,
        title: result.data.title,
        detail: result.data.status ?? "",
        href: `/apps/marketing/hypotheses?item=${result.data.id}`,
      };
  }
  if (params.create === "1" && z.uuid().safeParse(params.sourceId).success) {
    if (params.source === "evidence") {
      const result = await db
        .from("marketing_external_research_evidence")
        .select("id,title,evidence_id,run_id,evidence_type")
        .eq("organization_id", org)
        .eq("id", params.sourceId!)
        .maybeSingle();
      if (result.error) throw Error("Evidence could not load.");
      const row = result.data;
      if (row)
        source = {
          id: row.id,
          title: row.title ?? row.evidence_id,
          detail: `${row.evidence_id} · ${row.evidence_type} · Exact immutable Evidence`,
          href: `/apps/marketing/research?run=${row.run_id}&evidence=${row.id}`,
          source: {
            kind: "evidence",
            id: row.id,
            runId: row.run_id,
            evidenceKey: row.evidence_id,
          },
        };
    } else if (params.source === "note") {
      const result = await db
        .from("marketing_research")
        .select("id,title")
        .eq("organization_id", org)
        .eq("id", params.sourceId!)
        .is("archived_at", null)
        .maybeSingle();
      if (result.error) throw Error("Research Note could not load.");
      if (result.data)
        source = {
          id: result.data.id,
          title: result.data.title,
          detail: "Manual Research Note",
          href: `/apps/marketing/research?section=notes&item=${result.data.id}`,
          source: { kind: "note", id: result.data.id },
        };
    } else if (
      params.source === "opportunity" &&
      /^[0-3]$/.test(params.index ?? "")
    ) {
      const result = await db
        .from("marketing_external_research_reports")
        .select("id,run_id,structured_report")
        .eq("organization_id", org)
        .eq("id", params.sourceId!)
        .maybeSingle();
      if (result.error) throw Error("Opportunity could not load.");
      const report = result.data,
        body = report?.structured_report as {
          contentOpportunities?: { title?: unknown }[];
        } | null,
        index = Number(params.index);
      const candidate = body?.contentOpportunities?.[index];
      if (report && typeof candidate?.title === "string")
        source = {
          id: report.id,
          title: candidate.title.slice(0, 160),
          detail: "Content Opportunity candidate · exact report",
          href: `/apps/marketing/research?run=${report.run_id}`,
          source: { kind: "opportunity", id: report.id, index },
        };
    }
  }
  const title =
    kind === "hypothesis"
      ? "Hypotheses"
      : kind === "experiment"
        ? "Experiments"
        : "Learn";
  return (
    <MarketingPage
      activePath={growthRoutes[kind]}
      context={context}
      title={title}
      description="Turn evidence into deliberate tests and reviewed learning."
    >
      <GrowthWorkspace
        key={`${org}:${context.user.id}:${context.membership.role}:${kind}:${params.item ?? ""}`}
        kind={kind}
        list={list}
        detail={detail}
        selectedId={params.item}
        role={context.membership.role}
        members={members.data ?? []}
        initialCreate={params.create === "1"}
        initialHypothesis={hypothesis}
        initialSource={source}
      />
    </MarketingPage>
  );
}
