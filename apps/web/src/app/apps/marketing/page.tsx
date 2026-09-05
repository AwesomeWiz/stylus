import {
  ArrowRight,
  FileText,
  Lightbulb,
  Megaphone,
  Users,
} from "lucide-react";
import Link from "next/link";

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
  const recent = [...overview.recentResearch, ...overview.recentBriefs].slice(
    0,
    5,
  );
  return (
    <MarketingPage
      activePath="/apps/marketing"
      context={context}
      description="Campaigns, creative work and market intelligence in one focused view."
      title="Marketing Overview"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value], index) => {
          const Icon = [Megaphone, Users, Lightbulb, FileText][index]!;
          const tones = [
            "border-pastel-coral-border bg-pastel-coral text-pastel-coral-foreground",
            "border-pastel-mint-border bg-pastel-mint text-pastel-mint-foreground",
            "border-pastel-lilac-border bg-pastel-lilac text-pastel-lilac-foreground",
            "border-pastel-cream-border bg-pastel-cream text-pastel-cream-foreground",
          ];
          return (
            <div
              className={`rounded-xl border p-5 ${tones[index]}`}
              key={label}
            >
              <Icon className="size-5 opacity-70" />
              <p className="mt-5 text-3xl font-semibold tracking-tight">
                {value}
              </p>
              <p className="mt-1 text-sm opacity-75">{label}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border p-5">
          <h2 className="text-lg font-semibold tracking-tight">
            Reel ideas by status
          </h2>
          <div className="mt-4 divide-y">
            {Object.entries(overview.ideaCounts).map(([status, count]) => (
              <p className="flex justify-between py-3 text-sm" key={status}>
                <span>{status}</span>
                <strong>{count}</strong>
              </p>
            ))}
          </div>
        </section>
        <section className="rounded-xl border p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Recently updated
            </h2>
            <Link
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
              href="/apps/marketing/research"
            >
              Research <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4 divide-y">
            {recent.length ? (
              recent.map((item) => (
                <p className="py-3 text-sm" key={item.id}>
                  {item.title}
                </p>
              ))
            ) : (
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
