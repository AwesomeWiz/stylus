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
  }>;
}) {
  const { context } = await requireEnabledPlugin("marketing");
  const params = await searchParams;
  const archived = params.archived === "true";
  const [records, externalResearch] = await Promise.all([
    listMarketingResearch(context.organization.id, archived),
    getExternalResearchHistory(context.organization.id, params.run),
  ]);
  const visibleRecords = await includeSelectedMarketingRecord(
    records,
    context.organization.id,
    "marketing_research",
    params.item,
  );
  return (
    <MarketingPage
      activePath="/apps/marketing/research"
      context={context}
      description="Record manual notes or run bounded, evidence-linked external research."
      title="Research"
    >
      <div className="space-y-10">
        <ExternalResearchWorkspace
          {...externalResearch}
          selectedEvidenceId={params.evidence}
          initialInvocationKey={crypto.randomUUID()}
          role={context.membership.role}
          sourcePlanPreviews={getFashionResearchPlanPreviews()}
        />
        <section
          aria-labelledby="manual-research-heading"
          className="space-y-5"
        >
          <div>
            <h2 className="text-lg font-semibold" id="manual-research-heading">
              Manual research notes
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Curated notes remain separate from generated external research
              reports.
            </p>
          </div>
          <MarketingWorkspace
            area="research"
            archived={archived}
            records={visibleRecords}
            selectedId={params.item}
            role={context.membership.role}
          />
        </section>
      </div>
    </MarketingPage>
  );
}
