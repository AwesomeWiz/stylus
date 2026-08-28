import { CreativeStudio } from "@/components/marketing/creative-studio";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { getCompanyKnowledge } from "@/core/memory/server";
import { projectCompanyCreativeContext } from "@/modules/marketing/creative-council";
import { getCreativeStudioData } from "@/modules/marketing/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";

export default async function CreativeStudioPage() {
  const { context } = await requireEnabledPlugin("marketing");
  const [data, companyKnowledge] = await Promise.all([
    getCreativeStudioData(context.organization.id),
    getCompanyKnowledge(context.organization.id),
  ]);
  return (
    <MarketingPage
      activePath="/apps/marketing/creative-studio"
      context={context}
      description="Run the bounded three-stage council and review immutable Reel Brief versions."
      title="Creative Studio"
    >
      <CreativeStudio
        {...data}
        companyContext={projectCompanyCreativeContext(companyKnowledge)}
        initialIdempotencyKey={crypto.randomUUID()}
        role={context.membership.role}
      />
    </MarketingPage>
  );
}
