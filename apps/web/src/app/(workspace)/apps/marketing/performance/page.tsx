import { MarketingPage } from "@/components/marketing/marketing-page";
import { PerformanceWorkspace } from "@/components/marketing/performance-workspace";
import { getPerformanceWorkspaceData } from "@/modules/marketing/server/performance";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";

export default async function MarketingPerformancePage() {
  const { context } = await requireEnabledPlugin("marketing");
  const data = await getPerformanceWorkspaceData(context.organization.id);
  return (
    <MarketingPage
      activePath="/apps/marketing/performance"
      context={context}
      description="Record immutable Reel performance snapshots and derive bounded organization-local learnings."
      title="Performance"
    >
      <PerformanceWorkspace {...data} role={context.membership.role} />
    </MarketingPage>
  );
}
