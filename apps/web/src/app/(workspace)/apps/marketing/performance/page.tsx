import { MarketingPage } from "@/components/marketing/marketing-page";
import { PerformanceWorkspace } from "@/components/marketing/performance-workspace";
import { getPerformanceWorkspaceData } from "@/modules/marketing/server/performance";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
import { GrowthPerformanceSelection } from "@/components/marketing/growth-performance-selection";

export default async function MarketingPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string; learning?: string }>;
}) {
  const { context } = await requireEnabledPlugin("marketing");
  const data = await getPerformanceWorkspaceData(context.organization.id);
  const params = await searchParams;
  return (
    <MarketingPage
      activePath="/apps/marketing/performance"
      context={context}
      description="Record immutable Reel performance snapshots and derive bounded organization-local learnings."
      title="Performance"
    >
      <GrowthPerformanceSelection
        snapshotId={params.snapshot}
        learningId={params.learning}
      />
      <PerformanceWorkspace {...data} role={context.membership.role} />
    </MarketingPage>
  );
}
