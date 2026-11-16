"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { NotificationMenu } from "@/components/notifications/notification-menu";
import type { NotificationSummary } from "@/modules/notifications/server/data";
import { Sidebar } from "./sidebar";
import type { ShellIdentity, ShellOrganization } from "./app-shell";
import { navigationContext, type NavigationGroup } from "./navigation";

interface TopbarProps {
  activePath: string;
  identity: ShellIdentity;
  logoutAction: () => Promise<void>;
  notifications: NotificationSummary;
  navigationGroups: NavigationGroup[];
  organization: ShellOrganization;
}
export function Topbar({
  activePath,
  identity,
  logoutAction,
  notifications,
  navigationGroups,
  organization,
}: TopbarProps) {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-background sticky top-0 z-30 flex h-12 items-center gap-3 border-b px-4 sm:px-6">
      <div className="min-[1200px]:hidden">
        <Sheet
          title="Main navigation"
          open={open}
          onOpenChange={setOpen}
          trigger={
            <Button aria-label="Open navigation" size="icon" variant="ghost">
              <Menu aria-hidden="true" className="size-5" />
            </Button>
          }
        >
          <Sidebar
            activePath={activePath}
            identity={identity}
            logoutAction={logoutAction}
            navigationGroups={navigationGroups}
            organization={organization}
            onNavigate={() => setOpen(false)}
          />
        </Sheet>
      </div>
      <p className="min-w-0 truncate text-sm font-medium">
        {navigationContext(activePath)}
      </p>
      <span className="text-muted-foreground ml-auto hidden max-w-48 truncate text-xs sm:block">
        {organization.name}
      </span>
      <NotificationMenu
        key={JSON.stringify([
          organization.id,
          notifications.unreadCount,
          notifications.items.map((item) => [item.id, item.read_at]),
        ])}
        {...notifications}
        organizationId={organization.id}
      />
    </header>
  );
}
