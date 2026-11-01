import type { ReactNode } from "react";
import type { OrganizationRole } from "@/lib/supabase/database.types";
import type { NotificationSummary } from "@/modules/notifications/server/data";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import { getApplicationNavigation } from "@/plugins";
import { WorkspaceChrome } from "./workspace-chrome";

export interface ShellIdentity {
  displayName: string;
  email: string;
}
export interface ShellOrganization {
  id: string;
  name: string;
  role: OrganizationRole;
}
interface AppShellProps {
  activePath?: string;
  children: ReactNode;
  identity: ShellIdentity;
  logoutAction: () => Promise<void>;
  notifications?: NotificationSummary;
  organization: ShellOrganization;
  mainClassName?: string;
  enabledPluginIds?: string[];
}

export async function AppShell(props: AppShellProps) {
  const navigationGroups = getApplicationNavigation(
    props.enabledPluginIds ??
      (await getEnabledOrganizationPluginIds(props.organization.id)),
  );
  return (
    <WorkspaceChrome
      {...props}
      navigationGroups={navigationGroups}
      notifications={props.notifications ?? { items: [], unreadCount: 0 }}
    />
  );
}
