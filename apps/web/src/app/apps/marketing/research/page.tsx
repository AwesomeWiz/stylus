import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingWorkspace } from "@/components/marketing/marketing-workspace";
import { ExternalResearchWorkspace } from "@/components/marketing/external-research-workspace";
import {
  getExternalResearchHistory,
  listMarketingResearch,
} from "@/modules/marketing/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { context } = await requireEnabledPlugin("marketing");
  const archived = (await searchParams).archived === "true";
  const [records, externalResearch] = await Promise.all([
    listMarketingResearch(context.organization.id, archived),
    getExternalResearchHistory(context.organization.id),
  ]);
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
          initialInvocationKey={crypto.randomUUID()}
          role={context.membership.role}
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
            records={records}
            role={context.membership.role}
          />
        </section>
      </div>
    </MarketingPage>
  );
}
