import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingWorkspace } from "@/components/marketing/marketing-workspace";
import {
  listCoreCompetitorOptions,
  listMarketingCompetitors,
} from "@/modules/marketing/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { context } = await requireEnabledPlugin("marketing");
  const archived = (await searchParams).archived === "true";
  const [records, coreCompetitors] = await Promise.all([
    listMarketingCompetitors(context.organization.id, archived),
    listCoreCompetitorOptions(context.organization.id),
  ]);
  return (
    <MarketingPage
      activePath="/apps/marketing/competitors"
      context={context}
      description="Maintain manual Marketing competitor profiles without scraping or analysis."
      title="Competitors"
    >
      <MarketingWorkspace
        area="competitors"
        archived={archived}
        coreCompetitors={coreCompetitors}
        records={records}
        role={context.membership.role}
      />
    </MarketingPage>
  );
}
