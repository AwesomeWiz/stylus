import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingWorkspace } from "@/components/marketing/marketing-workspace";
import {
  listMarketingCampaignOptions,
  listMarketingReelIdeas,
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
    listMarketingReelIdeas(context.organization.id, archived),
    listMarketingCampaignOptions(context.organization.id),
  ]);
  return (
    <MarketingPage
      activePath="/apps/marketing/reel-ideas"
      context={context}
      description="Capture concise Instagram Reel concepts before production."
      title="Reel Ideas"
    >
      <MarketingWorkspace
        area="reel-ideas"
        archived={archived}
        campaigns={campaigns}
        records={records}
        role={context.membership.role}
      />
    </MarketingPage>
  );
}
