import { CalendarDays, FileText, Github } from "lucide-react";
export const integrationLabels = {
  github: {
    title: "GitHub",
    description: "Link repositories, issues, pull requests and commits.",
    scope: "Organization · managed by owners and admins",
    icon: Github,
  },
  "google-drive": {
    title: "Google Drive",
    description:
      "Find files and attach references without copying their contents.",
    scope: "Private to you · share references explicitly",
    icon: FileText,
  },
  "google-calendar": {
    title: "Google Calendar",
    description: "Link events and explicitly add dated work to your calendar.",
    scope: "Private to you · no automatic synchronization",
    icon: CalendarDays,
  },
};
export const integrationControl =
  "bg-background min-h-11 w-full rounded-md border px-3 text-sm";
