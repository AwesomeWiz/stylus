import {
  Blocks,
  Building2,
  CalendarCheck2,
  Home,
  LayoutDashboard,
  Library,
  ListChecks,
  Laptop,
  Settings,
  Users,
  BrainCircuit,
  Megaphone,
  FlaskConical,
} from "lucide-react";
import type { PluginIconId } from "@/core/plugins/public";

// Serializable IDs keep the server plugin registry out of the client shell.
const icons = {
  home: Home,
  tasks: CalendarCheck2,
  boards: LayoutDashboard,
  settings: Settings,
  blocks: Blocks,
  megaphone: Megaphone,
  "flask-conical": FlaskConical,
  company: Building2,
  knowledge: Library,
  jobs: ListChecks,
  workers: Laptop,
  team: Users,
  ai: BrainCircuit,
};
export type NavigationIconId = keyof typeof icons | PluginIconId;
export const getNavigationIcon = (id: NavigationIconId) => icons[id];

export interface NavigationItem {
  label: string;
  icon: NavigationIconId;
  href: string;
}
export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const coreNavigationGroups: NavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Home", icon: "home", href: "/" },
      { label: "Tasks", icon: "tasks", href: "/tasks" },
      { label: "Boards", icon: "boards", href: "/whiteboards" },
    ],
  },
  {
    label: "Utility",
    items: [{ label: "Settings", icon: "settings", href: "/settings" }],
  },
];
export const navigationGroups = coreNavigationGroups;

export const settingsNavigation: NavigationItem[] = [
  {
    label: "Company / Organization",
    href: "/company/profile",
    icon: "company",
  },
  { label: "Team", href: "/team", icon: "team" },
  { label: "Knowledge / Memory", href: "/memory", icon: "knowledge" },
  { label: "AI", href: "/ai", icon: "ai" },
  { label: "Integrations / Apps", href: "/apps", icon: "blocks" },
  { label: "Workers", href: "/workers", icon: "workers" },
  { label: "Advanced / Jobs", href: "/jobs", icon: "jobs" },
];

export function globalNavigationPath(path: string) {
  if (path === "/activity") return "/";
  if (path === "/apps/marketing" || path.startsWith("/apps/marketing/"))
    return "/apps/marketing";
  if (path === "/tasks" || path.startsWith("/tasks/")) return "/tasks";
  if (path === "/whiteboards" || path.startsWith("/whiteboards/"))
    return "/whiteboards";
  if (
    path === "/settings" ||
    settingsNavigation.some(
      ({ href }) => path === href || path.startsWith(href + "/"),
    )
  )
    return "/settings";
  return path;
}

export function navigationContext(path: string) {
  const active = globalNavigationPath(path);
  const settings =
    active === "/settings" &&
    settingsNavigation.find(
      ({ href }) => path === href || path.startsWith(href + "/"),
    );
  if (settings) return `Settings / ${settings.label}`;
  return (
    (
      {
        "/": "Home",
        "/tasks": "Tasks",
        "/whiteboards": "Boards",
        "/apps/marketing": "Marketing",
        "/settings": "Settings",
      } as Record<string, string>
    )[active] ?? "Workspace"
  );
}
