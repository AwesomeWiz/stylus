import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { WorkersWorkspace } from "@/components/workers/workers-workspace";
import { logoutAction } from "@/modules/auth/actions";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getOrganizationWorkers } from "@/modules/workers/server/data";

export default async function WorkersPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const [workers, notifications] = await Promise.all([
    getOrganizationWorkers(context.organization.id),
    getNotificationSummary(context.organization.id, context.user.id),
  ]);
  return (
    <AppShell
      activePath="/workers"
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      notifications={notifications}
      organization={{
        id: context.organization.id,
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
      <WorkersWorkspace role={context.membership.role} workers={workers} />
    </AppShell>
  );
}
