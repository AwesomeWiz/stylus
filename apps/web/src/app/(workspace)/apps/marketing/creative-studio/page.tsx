import { CreativeStudio } from "@/components/marketing/creative-studio";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { getCompanyKnowledge } from "@/core/memory/server";
import { projectCompanyCreativeContext } from "@/modules/marketing/creative-council";
import { getCreativeStudioData } from "@/modules/marketing/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
import { GrowthCreativeSelection } from "@/components/marketing/growth-creative-selection";

export default async function CreativeStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ brief?: string }>;
}) {
  const { context } = await requireEnabledPlugin("marketing");
  const params = await searchParams;
  const [data, companyKnowledge] = await Promise.all([
    getCreativeStudioData(context.organization.id),
    getCompanyKnowledge(context.organization.id),
  ]);
  return (
    <MarketingPage
      activePath="/apps/marketing/creative-studio"
      context={context}
      description="Create immutable Reel Briefs and run bounded five-stage strategic reviews."
      title="Creative Studio"
    >
      <GrowthCreativeSelection briefId={params.brief} />
      <CreativeStudio
        {...data}
        companyContext={projectCompanyCreativeContext(companyKnowledge)}
        initialIdempotencyKey={crypto.randomUUID()}
        initialStrategicReviewIdempotencyKey={crypto.randomUUID()}
        role={context.membership.role}
      />
    </MarketingPage>
  );
}
