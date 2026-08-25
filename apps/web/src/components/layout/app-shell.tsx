import type { ReactNode } from "react";

import type { OrganizationRole } from "@/lib/supabase/database.types";
import type { NotificationSummary } from "@/modules/notifications/server/data";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export interface ShellIdentity {
  displayName: string;
  email: string;
}

export interface ShellOrganization {
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
}

export function AppShell({
  activePath,
  children,
  identity,
  logoutAction,
  notifications = { items: [], unreadCount: 0 },
  organization,
}: AppShellProps) {
  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 hidden w-64 border-r lg:block">
        <Sidebar
          activePath={activePath}
          identity={identity}
          logoutAction={logoutAction}
          organization={organization}
        />
      </aside>
      <div className="min-w-0">
        <Topbar
          activePath={activePath}
          identity={identity}
          logoutAction={logoutAction}
          notifications={notifications}
          organization={organization}
        />
        <main className="mx-auto w-full max-w-[96rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
