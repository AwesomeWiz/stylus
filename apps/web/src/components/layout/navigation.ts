import {
  AppWindow,
  Bot,
  BrainCircuit,
  Building2,
  CalendarCheck2,
  Clapperboard,
  FlaskConical,
  Home,
  History,
  LayoutDashboard,
  Megaphone,
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

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Core",
    items: [
      { label: "Home", icon: Home, href: "/" },
      { label: "Tasks", icon: CalendarCheck2, href: "/tasks" },
      { label: "Activity", icon: History, href: "/activity" },
      { label: "Whiteboards", icon: LayoutDashboard, href: "#whiteboards" },
      { label: "Company Profile", icon: Building2, href: "/company/profile" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Overview", icon: Megaphone, href: "#marketing" },
      { label: "Reels", icon: Clapperboard, href: "#reels" },
      { label: "Competitors", icon: Users, href: "#competitors" },
      { label: "Research", icon: FlaskConical, href: "#research" },
      { label: "Campaigns", icon: AppWindow, href: "#campaigns" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "AI", icon: BrainCircuit, href: "#ai" },
      { label: "Apps", icon: Bot, href: "#apps" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Team", icon: Users, href: "#team" },
      { label: "Settings", icon: Settings, href: "#settings" },
    ],
  },
];
