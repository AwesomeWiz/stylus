import {
  Blocks,
  BrainCircuit,
  Building2,
  CalendarCheck2,
  Home,
  History,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const coreNavigationGroups: NavigationGroup[] = [
  {
    label: "Core",
    items: [
      { label: "Home", icon: Home, href: "/" },
      { label: "Tasks", icon: CalendarCheck2, href: "/tasks" },
      { label: "Activity", icon: History, href: "/activity" },
      { label: "Whiteboards", icon: LayoutDashboard, href: "/whiteboards" },
      { label: "Company Profile", icon: Building2, href: "/company/profile" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "AI", icon: BrainCircuit, href: "#ai" },
      { label: "Apps", icon: Blocks, href: "/apps" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Team", icon: Users, href: "/team" },
      { label: "Settings", icon: Settings, href: "#settings" },
    ],
  },
];

export const navigationGroups = coreNavigationGroups;
