import { ChevronsUpDown } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { Brand } from "./brand";
import { navigationGroups } from "./navigation";

export function Sidebar() {
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
                    aria-current={item.active ? "page" : undefined}
                    className={cn(
                      "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                      item.active && "bg-sidebar-accent text-accent-foreground",
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
        <button className="hover:bg-sidebar-accent flex min-h-12 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors">
          <Avatar fallback="AM" />
          <span className="min-w-0 flex-1">
            <span className="text-sidebar-foreground block truncate text-sm font-medium">
              Alex Morgan
            </span>
            <span className="text-sidebar-muted block truncate text-xs">
              Acme workspace
            </span>
          </span>
          <ChevronsUpDown
            aria-hidden="true"
            className="text-sidebar-muted size-4"
          />
          <span className="sr-only">Open account menu</span>
        </button>
      </div>
    </div>
  );
}
