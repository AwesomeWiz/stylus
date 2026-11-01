"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ShellIdentity, ShellOrganization } from "./app-shell";
import type { NavigationGroup } from "./navigation";
import { navigationContext } from "./navigation";
import type { NotificationSummary } from "@/modules/notifications/server/data";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const preferenceKey = "stylus-sidebar-collapsed";
function collapsedSnapshot() {
  try {
    return localStorage.getItem(preferenceKey) === "true";
  } catch {
    return null;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("stylus-sidebar-change", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("stylus-sidebar-change", listener);
  };
}

export function WorkspaceChrome({
  children,
  identity,
  organization,
  logoutAction,
  navigationGroups,
  notifications,
  mainClassName,
  activePath,
}: {
  children: ReactNode;
  identity: ShellIdentity;
  organization: ShellOrganization;
  logoutAction: () => Promise<void>;
  navigationGroups: NavigationGroup[];
  notifications: NotificationSummary;
  mainClassName?: string;
  activePath?: string;
}) {
  const pathname = usePathname() ?? activePath ?? "/";
  const storedCollapsed = useSyncExternalStore(
    subscribe,
    collapsedSnapshot,
    () => false,
  );
  const [temporaryCollapsed, setTemporaryCollapsed] = useState(false);
  const collapsed = storedCollapsed ?? temporaryCollapsed;
  const previousPath = useRef(pathname);
  const main = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Refresh private shell metadata on returning to the app; no polling or
    // second full-page refresh on every client navigation.
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    document.title = `${navigationContext(pathname)} · Stylus`;
    const focusHeading = () => {
      const heading = main.current?.querySelector("h1");
      if (!heading) return false;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };
    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    if (main.current)
      observer.observe(main.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  function toggle() {
    try {
      localStorage.setItem(preferenceKey, String(!collapsed));
    } catch {
      setTemporaryCollapsed(!collapsed);
      return;
    }
    window.dispatchEvent(new Event("stylus-sidebar-change"));
  }

  return (
    <div
      className={cn(
        "min-h-screen",
        collapsed ? "min-[1200px]:pl-14" : "min-[1200px]:pl-56",
      )}
      data-workspace-shell
    >
      <a
        href="#main-content"
        className="bg-background focus:ring-ring sr-only z-50 rounded-md border p-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2"
      >
        Skip to content
      </a>
      <aside
        id="workspace-sidebar"
        className={cn(
          "bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 hidden flex-col border-r min-[1200px]:flex",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <Sidebar
          activePath={pathname}
          identity={identity}
          organization={organization}
          logoutAction={logoutAction}
          navigationGroups={navigationGroups}
          collapsed={collapsed}
        />
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="workspace-sidebar"
          onClick={toggle}
          className="text-muted-foreground hover:bg-muted mx-2 mb-2 flex min-h-10 items-center justify-center gap-2 rounded-md text-xs"
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-4" />
          ) : (
            <>
              <PanelLeftClose aria-hidden="true" className="size-4" />
              Collapse sidebar
            </>
          )}
        </button>
      </aside>
      <div className="min-w-0">
        <Topbar
          activePath={pathname}
          identity={identity}
          organization={organization}
          logoutAction={logoutAction}
          navigationGroups={navigationGroups}
          notifications={notifications}
        />
        <main
          id="main-content"
          tabIndex={-1}
          ref={main}
          className={cn(
            "mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6",
            mainClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
