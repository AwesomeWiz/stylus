import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Sheet } from "@/components/ui/sheet";
import { NotificationMenu } from "@/components/notifications/notification-menu";
import type { NotificationSummary } from "@/modules/notifications/server/data";

import { Sidebar } from "./sidebar";
import type { ShellIdentity, ShellOrganization } from "./app-shell";
import type { NavigationGroup } from "./navigation";

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
  return (
    <header className="bg-background/95 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="lg:hidden">
        <Sheet
          title="Main navigation"
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
          />
        </Sheet>
      </div>
      <SearchInput className="max-w-md flex-1" />
      <div className="ml-auto flex items-center gap-1">
        <NotificationMenu {...notifications} />
      </div>
    </header>
  );
}
