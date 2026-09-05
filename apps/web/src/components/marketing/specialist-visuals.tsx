import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  ChartNoAxesColumnIncreasing,
  FilePenLine,
  Lightbulb,
  Magnet,
  Palette,
  Scale,
  Search,
  ShieldQuestion,
  Sparkles,
  TimerReset,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

type SpecialistVisual = { icon: LucideIcon; label: string };

export const specialistVisuals: Record<string, SpecialistVisual> = {
  "marketing.audience-researcher": {
    icon: UsersRound,
    label: "Audience Researcher",
  },
  "marketing.brand-director": { icon: BadgeCheck, label: "Brand Director" },
  "marketing.competitor-analyst": { icon: Search, label: "Competitor Analyst" },
  "marketing.content-strategist": {
    icon: Lightbulb,
    label: "Content Strategist",
  },
  "marketing.creative-critic": {
    icon: ShieldQuestion,
    label: "Creative Critic",
  },
  "marketing.hook-strategist": { icon: Magnet, label: "Hook Strategist" },
  "marketing.retention-editor": { icon: TimerReset, label: "Retention Editor" },
  "marketing.script-writer": { icon: FilePenLine, label: "Script Writer" },
  "marketing.trend-researcher": {
    icon: ChartNoAxesColumnIncreasing,
    label: "Trend Strategist",
  },
  "marketing.visual-director": { icon: Palette, label: "Visual Strategist" },
  "strategic.challenge": { icon: ShieldQuestion, label: "Challenge" },
  "strategic.judge": { icon: Scale, label: "Judge" },
  council: { icon: Sparkles, label: "Creative Council" },
};

export function SpecialistIdentity({
  className,
  id,
  label,
}: {
  className?: string;
  id: string;
  label?: string;
}) {
  const visual = specialistVisuals[id] ?? {
    icon: Sparkles,
    label: label ?? id,
  };
  const Icon = visual.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="bg-primary-subtle text-accent-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md">
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      <span>{label ?? visual.label}</span>
    </span>
  );
}
