import { notFound } from "next/navigation";

import { CompetitorReels } from "@/components/marketing/competitor-reels";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { getMarketingCompetitorDetail } from "@/modules/marketing/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";

export default async function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ competitorId: string }>;
}) {
  const { competitorId } = await params;
  const { context } = await requireEnabledPlugin("marketing");
  const detail = await getMarketingCompetitorDetail(
    context.organization.id,
    competitorId,
  );
  if (!detail) notFound();
  return (
    <MarketingPage
      activePath="/apps/marketing/competitors"
      context={context}
      description="Upload permitted MP4 media and review durable competitor Reel intelligence."
      title={detail.competitor.name}
    >
      <CompetitorReels
        analyses={detail.analyses}
        competitorId={detail.competitor.id}
        reels={detail.reels}
        role={context.membership.role}
        transcripts={detail.transcripts}
      />
    </MarketingPage>
  );
}
