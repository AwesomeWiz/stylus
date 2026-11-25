import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { getHomeCoreData } from "@/modules/home/server/data";
import { getWorkspaceAttention } from "@/plugins";
import { canMutateTasks } from "@/modules/tasks/authorization";
export default async function HomePage() {
  const context = await getWorkspaceContext(),
    now = new Date();
  const [home, extensions] = await Promise.all([
    getHomeCoreData(context.organization.id, now),
    getWorkspaceAttention(context.organization.id, now.toISOString()),
  ]);
  return (
    <HomeDashboard
      activity={home.activity}
      attention={[...home.attention, ...extensions]}
      canMutate={canMutateTasks(context.membership.role)}
      members={home.members}
      displayName={context.user.displayName}
      organizationName={context.organization.name}
    />
  );
}

export const metadata = { title: "Home" };
