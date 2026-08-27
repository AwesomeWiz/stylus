import { MarketingPage } from "@/components/marketing/marketing-page";
import { getMarketingOverview } from "@/modules/marketing/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";

export default async function MarketingOverviewPage() {
  const { context } = await requireEnabledPlugin("marketing");
  const overview = await getMarketingOverview(context.organization.id);
  const stats = [
    ["Active campaigns", overview.activeCampaigns],
    ["Competitors", overview.competitorCount],
    [
      "Reel ideas",
      Object.values(overview.ideaCounts).reduce((a, b) => a + b, 0),
    ],
    ["Creative briefs", overview.briefCount],
  ] as const;
  return (
    <MarketingPage
      activePath="/apps/marketing"
      context={context}
      description="A compact view of current manual Marketing work."
      title="Marketing Overview"
    >
      <div className="bg-border grid gap-px overflow-hidden rounded-md border sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div className="bg-background p-5" key={label}>
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-semibold">Reel ideas by status</h2>
          <div className="mt-3 divide-y border-y">
            {Object.entries(overview.ideaCounts).map(([status, count]) => (
              <p className="flex justify-between py-3 text-sm" key={status}>
                <span>{status}</span>
                <strong>{count}</strong>
              </p>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-semibold">Recently updated</h2>
          <div className="mt-3 divide-y border-y">
            {[...overview.recentResearch, ...overview.recentBriefs]
              .slice(0, 5)
              .map((item) => (
                <p className="py-3 text-sm" key={item.id}>
                  {item.title}
                </p>
              )) || (
              <p className="text-muted-foreground py-3 text-sm">
                No recent records.
              </p>
            )}
          </div>
        </section>
      </div>
    </MarketingPage>
  );
}
