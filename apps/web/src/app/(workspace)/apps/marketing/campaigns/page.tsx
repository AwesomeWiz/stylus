import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingWorkspace } from "@/components/marketing/marketing-workspace";
import { listMarketingCampaigns } from "@/modules/marketing/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { context } = await requireEnabledPlugin("marketing");
  const archived = (await searchParams).archived === "true";
  const records = await listMarketingCampaigns(
    context.organization.id,
    archived,
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
        records={records}
        role={context.membership.role}
      />
    </MarketingPage>
  );
}
