import { ChevronDown, LogOut } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { Brand } from "./brand";
import type { NavigationGroup } from "./navigation";
import type { ShellIdentity, ShellOrganization } from "./app-shell";

interface SidebarProps {
  activePath: string;
  identity: ShellIdentity;
  logoutAction: () => Promise<void>;
  navigationGroups: NavigationGroup[];
  organization: ShellOrganization;
}

function getInitials(displayName: string) {
  return (
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ST"
  );
}

export function Sidebar({
  activePath,
  identity,
  logoutAction,
  navigationGroups,
  organization,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <Brand />
      <nav
        aria-label="Primary navigation"
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {navigationGroups.map((group) => (
          <div className="mb-5" key={group.label}>
            <p className="text-sidebar-muted mb-1.5 px-2 text-[10px] font-semibold tracking-[0.12em] uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.label}>
                  <a
                    aria-current={item.href === activePath ? "page" : undefined}
                    className={cn(
                      "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                      item.href === activePath &&
                        "bg-sidebar-accent text-accent-foreground",
                    )}
                    href={item.href}
                  >
                    <item.icon
                      aria-hidden="true"
                      className="size-4 shrink-0"
                      strokeWidth={1.9}
                    />
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-sidebar-border border-t p-3">
        <details className="group relative">
          <summary className="hover:bg-sidebar-accent flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-md px-2 transition-colors [&::-webkit-details-marker]:hidden">
            <Avatar fallback={getInitials(identity.displayName)} />
            <span className="min-w-0 flex-1">
              <span className="text-sidebar-foreground block truncate text-sm font-medium">
                {identity.displayName}
              </span>
              <span className="text-sidebar-muted block truncate text-xs">
                {organization.name}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="text-sidebar-muted size-4 transition-transform group-open:rotate-180"
            />
            <span className="sr-only">Open account menu</span>
          </summary>
          <div className="bg-popover absolute right-0 bottom-[calc(100%+0.5rem)] left-0 rounded-md border p-1 shadow-md">
            <div className="border-b px-2 py-2">
              <p className="truncate text-xs font-medium">{identity.email}</p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {organization.role.toLowerCase()}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                className="text-muted-foreground hover:bg-muted hover:text-foreground mt-1 flex min-h-9 w-full items-center gap-2 rounded-sm px-2 text-sm font-medium transition-colors"
                type="submit"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Sign out
              </button>
            </form>
          </div>
        </details>
      </div>
    </div>
  );
}
