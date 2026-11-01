import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { logoutAction } from "@/modules/auth/actions";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const [notifications, enabledPluginIds] = await Promise.all([
    getNotificationSummary(context.organization.id, context.user.id),
    getEnabledOrganizationPluginIds(context.organization.id),
  ]);
  return (
    <AppShell
      key={`${context.user.id}:${context.organization.id}:${context.membership.role}`}
      identity={context.user}
      logoutAction={logoutAction}
      notifications={notifications}
      enabledPluginIds={enabledPluginIds}
      organization={{
        id: context.organization.id,
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
      {children}
    </AppShell>
  );
}
