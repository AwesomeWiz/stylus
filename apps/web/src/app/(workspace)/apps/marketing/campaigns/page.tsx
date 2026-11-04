import { includeSelectedMarketingRecord } from "@/modules/marketing/server/data";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingWorkspace } from "@/components/marketing/marketing-workspace";
import { listMarketingCampaigns } from "@/modules/marketing/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
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
  const records = await listMarketingCampaigns(
    context.organization.id,
    archived,
  );
  const visibleRecords = await includeSelectedMarketingRecord(
    records,
    context.organization.id,
    "marketing_campaigns",
    params.item,
  );
  return (
    <MarketingPage
      activePath="/apps/marketing/campaigns"
      context={context}
      description="Organize manual campaign objectives, dates, and lifecycle."
      title="Campaigns"
    >
      <MarketingWorkspace
        area="campaigns"
        archived={archived}
        records={visibleRecords}
        selectedId={params.item}
        role={context.membership.role}
      />
    </MarketingPage>
  );
}
