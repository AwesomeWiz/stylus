import { includeSelectedMarketingRecord } from "@/modules/marketing/server/data";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingWorkspace } from "@/components/marketing/marketing-workspace";
import {
  listMarketingCampaignOptions,
  listMarketingCreativeBriefs,
} from "@/modules/marketing/server/data";
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
  const [records, campaigns] = await Promise.all([
    listMarketingCreativeBriefs(context.organization.id, archived),
    listMarketingCampaignOptions(context.organization.id),
  ]);
  const visibleRecords = await includeSelectedMarketingRecord(
    records,
    context.organization.id,
    "marketing_creative_briefs",
    params.item,
  );
  return (
    <MarketingPage
      activePath="/apps/marketing/creative-briefs"
      context={context}
      description="Structure creative direction for future production workflows."
      title="Creative Briefs"
    >
      <MarketingWorkspace
        area="creative-briefs"
        archived={archived}
        campaigns={campaigns}
        records={visibleRecords}
        selectedId={params.item}
        role={context.membership.role}
      />
    </MarketingPage>
  );
}
