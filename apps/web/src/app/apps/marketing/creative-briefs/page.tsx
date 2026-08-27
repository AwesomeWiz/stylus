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
  searchParams: Promise<{ archived?: string }>;
}) {
  const { context } = await requireEnabledPlugin("marketing");
  const archived = (await searchParams).archived === "true";
  const [records, campaigns] = await Promise.all([
    listMarketingCreativeBriefs(context.organization.id, archived),
    listMarketingCampaignOptions(context.organization.id),
  ]);
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
        records={records}
        role={context.membership.role}
      />
    </MarketingPage>
  );
}
