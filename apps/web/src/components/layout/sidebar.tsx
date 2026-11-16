import { ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import {
  globalNavigationPath,
  getNavigationIcon,
  type NavigationGroup,
} from "./navigation";
import { NavigationLink } from "./navigation-link";
import type { ShellIdentity, ShellOrganization } from "./app-shell";

interface SidebarProps {
  activePath: string;
  identity: ShellIdentity;
  logoutAction: () => Promise<void>;
  navigationGroups: NavigationGroup[];
  organization: ShellOrganization;
  collapsed?: boolean;
  onNavigate?: () => void;
}
function getInitials(name: string) {
  return (
    name
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
  collapsed = false,
  onNavigate,
}: SidebarProps) {
  const active = globalNavigationPath(activePath);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Brand collapsed={collapsed} />
      <nav
        aria-label="Primary navigation"
        className={cn(
          "flex min-h-0 flex-1 flex-col px-2 py-3",
          collapsed ? "overflow-visible" : "overflow-y-auto",
        )}
      >
        {navigationGroups.map((group) => (
          <ul
            key={group.label}
            aria-label={group.label}
            className={cn(
              "space-y-1",
              group.label === "Utility" && "mt-auto border-t pt-3",
            )}
          >
            {group.items.map((item) => {
              const Icon = getNavigationIcon(item.icon);
              return (
                <li key={item.href} className="group/nav relative">
                  <NavigationLink
                    href={item.href}
                    current={active === item.href}
                    onNavigate={onNavigate}
                    label={collapsed ? item.label : undefined}
                    className={cn(
                      "text-sidebar-muted hover:bg-muted hover:text-sidebar-foreground relative flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium",
                      collapsed && "justify-center px-0",
                      active === item.href &&
                        "bg-primary-subtle text-accent-foreground before:bg-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0"
                      strokeWidth={1.9}
                    />
                    <span className={collapsed ? "sr-only" : undefined}>
                      {item.label}
                    </span>
                  </NavigationLink>
                  {collapsed ? (
                    <span
                      aria-hidden="true"
                      className="bg-popover text-popover-foreground pointer-events-none absolute top-1/2 left-full z-50 ml-2 hidden -translate-y-1/2 rounded-md border px-2 py-1 text-xs whitespace-nowrap group-focus-within/nav:block group-hover/nav:block"
                    >
                      {item.label}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ))}
      </nav>
      <div className="border-sidebar-border border-t p-2">
        <details className="group/account relative">
          <summary
            aria-label={
              "Open account menu for " +
              identity.displayName +
              " at " +
              organization.name
            }
            className={cn(
              "hover:bg-muted flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md px-1 [&::-webkit-details-marker]:hidden",
              collapsed && "justify-center",
            )}
          >
            <Avatar fallback={getInitials(identity.displayName)} />
            <span className={collapsed ? "sr-only" : "min-w-0 flex-1"}>
              <span className="text-sidebar-foreground block truncate text-sm font-medium">
                {identity.displayName}
              </span>
              <span className="text-sidebar-muted block truncate text-xs">
                {organization.name}
              </span>
            </span>
            {!collapsed ? (
              <ChevronDown
                aria-hidden="true"
                className="text-sidebar-muted size-3.5"
              />
            ) : null}
          </summary>
          <div
            className={cn(
              "bg-popover absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-60 rounded-md border p-1 shadow-sm",
              collapsed ? "left-10" : "w-full",
            )}
          >
            <div className="border-b px-2 py-2">
              <p className="truncate text-xs font-medium">{identity.email}</p>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                {organization.name} · {organization.role.toLowerCase()}
              </p>
            </div>
            <Link
              href="/settings"
              onNavigate={onNavigate}
              className="hover:bg-muted flex min-h-10 items-center rounded-sm px-2 text-sm"
            >
              Account settings
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-muted-foreground hover:bg-muted flex min-h-10 w-full items-center gap-2 rounded-sm px-2 text-sm"
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
