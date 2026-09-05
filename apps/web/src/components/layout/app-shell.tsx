import type { ReactNode } from "react";

import type { OrganizationRole } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import type { NotificationSummary } from "@/modules/notifications/server/data";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import { getApplicationNavigation } from "@/plugins";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

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
  activePath: string;
  children: ReactNode;
  identity: ShellIdentity;
  logoutAction: () => Promise<void>;
  notifications?: NotificationSummary;
  organization: ShellOrganization;
  mainClassName?: string;
}

export async function AppShell({
  activePath,
  children,
  identity,
  logoutAction,
  notifications = { items: [], unreadCount: 0 },
  organization,
  mainClassName,
}: AppShellProps) {
  const navigationGroups = getApplicationNavigation(
    await getEnabledOrganizationPluginIds(organization.id),
  );
  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 hidden w-64 border-r lg:block">
        <Sidebar
          activePath={activePath}
          identity={identity}
          logoutAction={logoutAction}
          navigationGroups={navigationGroups}
          organization={organization}
        />
      </aside>
      <div className="min-w-0">
        <Topbar
          activePath={activePath}
          identity={identity}
          logoutAction={logoutAction}
          notifications={notifications}
          navigationGroups={navigationGroups}
          organization={organization}
        />
        <main
          className={cn(
            "mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-9",
            mainClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
