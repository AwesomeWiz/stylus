import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { ActivityList } from "@/components/activity/activity-list";
import { PageHeader } from "@/components/ui/page-header";
import { getActivityHistory } from "@/modules/activity/server/data";

export default async function ActivityPage() {
  const context = await getWorkspaceContext();

  const activity = await getActivityHistory(context.organization.id);

  return (
    <>
      <PageHeader
        description="A concise history of meaningful task collaboration across your organization."
        title="Activity"
      />
      <ActivityList events={activity.events} members={activity.members} />
    </>
  );
}
