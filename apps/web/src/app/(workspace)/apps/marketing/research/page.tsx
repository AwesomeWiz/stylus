import Link from "next/link";
import { GrowthResearchIndex } from "@/components/marketing/growth-research-index";
import { includeSelectedMarketingRecord } from "@/modules/marketing/server/data";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingWorkspace } from "@/components/marketing/marketing-workspace";
import { ExternalResearchWorkspace } from "@/components/marketing/external-research-workspace";
import {
  getExternalResearchHistory,
  listMarketingResearch,
} from "@/modules/marketing/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
import { getFashionResearchPlanPreviews } from "@/modules/marketing/server/fashion-research-planner";

export const maxDuration = 60;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    archived?: string;
    item?: string;
    run?: string;
    evidence?: string;
    section?: string;
    query?: string;
    after?: string;
  }>;
}) {
  const { context } = await requireEnabledPlugin("marketing");
  const params = await searchParams;
  const archived = params.archived === "true";
  const section = ["reports", "evidence", "notes", "opportunities"].includes(
    params.section ?? "",
  )
    ? params.section!
    : params.evidence
      ? "evidence"
      : params.item
        ? "notes"
        : "reports";
  const [records, externalResearch] = await Promise.all([
    section === "notes"
      ? listMarketingResearch(context.organization.id, archived)
      : Promise.resolve([]),
    section === "reports"
      ? getExternalResearchHistory(context.organization.id, params.run)
      : Promise.resolve({ evidence: [], reports: [], runs: [], sources: [] }),
  ]);
  const visibleRecords = await includeSelectedMarketingRecord(
    records,
    context.organization.id,
    "marketing_research",
    params.item,
  );
  return (
    <MarketingPage
      activePath={"/apps/marketing/research?section=" + section}
      context={context}
      description="Record manual notes or run bounded, evidence-linked external research."
      title="Research"
    >
      <div className="space-y-10">
        {section === "evidence" || section === "opportunities" ? (
          <GrowthResearchIndex section={section} params={params} />
        ) : null}
        {section === "reports" ? (
          <ExternalResearchWorkspace
            {...externalResearch}
            selectedEvidenceId={params.evidence}
            initialInvocationKey={crypto.randomUUID()}
            role={context.membership.role}
            sourcePlanPreviews={getFashionResearchPlanPreviews()}
          />
        ) : null}
        {section === "notes" ? (
          <section
            aria-labelledby="manual-research-heading"
            className="space-y-5"
          >
            <div>
              <h2
                className="text-lg font-semibold"
                id="manual-research-heading"
              >
                Manual research notes
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Curated notes remain separate from generated external research
                reports.
              </p>
            </div>
            {params.item &&
            context.membership.role !== "VIEWER" &&
            visibleRecords.some(
              (r) => r.id === params.item && !r.archived_at,
            ) ? (
              <Link
                className="text-primary inline-block min-h-11 py-2 text-sm underline"
                href={`/apps/marketing/hypotheses?create=1&source=note&sourceId=${params.item}`}
              >
                Create Hypothesis from this Note
              </Link>
            ) : null}
            <MarketingWorkspace
              area="research"
              archived={archived}
              records={visibleRecords}
              selectedId={params.item}
              role={context.membership.role}
            />
          </section>
        ) : null}
      </div>
    </MarketingPage>
  );
}

export const metadata = { title: "Research" };
