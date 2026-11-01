import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { canMutateTasks } from "@/modules/tasks/authorization";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import { getMarketingOverview } from "@/modules/marketing/server/data";
import { getHomeCoreData } from "@/modules/home/server/data";

export default async function HomePage() {
  const context = await getWorkspaceContext();

  const [home, enabledPluginIds] = await Promise.all([
    getHomeCoreData(context.organization.id),
    getEnabledOrganizationPluginIds(context.organization.id),
  ]);
  const marketing = enabledPluginIds.includes("marketing")
    ? await getMarketingOverview(context.organization.id)
    : null;

  return (
    <HomeDashboard
      activity={home.activity}
      canMutate={canMutateTasks(context.membership.role)}
      currentUserId={context.user.id}
      marketing={marketing}
      members={home.members}
      nowIso={new Date().toISOString()}
      organizationName={context.organization.name}
      tasks={home.tasks}
    />
  );
}
