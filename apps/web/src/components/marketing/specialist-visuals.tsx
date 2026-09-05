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
import {
  accentVisuals,
  type AccentTone,
} from "@/components/ui/semantic-visuals";

type SpecialistVisual = {
  icon: LucideIcon;
  label: string;
  tone: AccentTone;
};

export const specialistVisuals: Record<string, SpecialistVisual> = {
  "marketing.audience-researcher": {
    icon: UsersRound,
    label: "Audience Researcher",
    tone: "blue",
  },
  "marketing.brand-director": {
    icon: BadgeCheck,
    label: "Brand Director",
    tone: "violet",
  },
  "marketing.competitor-analyst": {
    icon: Search,
    label: "Competitor Analyst",
    tone: "amber",
  },
  "marketing.content-strategist": {
    icon: Lightbulb,
    label: "Content Strategist",
    tone: "indigo",
  },
  "marketing.creative-critic": {
    icon: ShieldQuestion,
    label: "Creative Critic",
    tone: "coral",
  },
  "marketing.hook-strategist": {
    icon: Magnet,
    label: "Hook Strategist",
    tone: "pink",
  },
  "marketing.retention-editor": {
    icon: TimerReset,
    label: "Retention Editor",
    tone: "cyan",
  },
  "marketing.script-writer": {
    icon: FilePenLine,
    label: "Script Writer",
    tone: "violet",
  },
  "marketing.trend-researcher": {
    icon: ChartNoAxesColumnIncreasing,
    label: "Trend Strategist",
    tone: "green",
  },
  "marketing.visual-director": {
    icon: Palette,
    label: "Visual Strategist",
    tone: "pink",
  },
  "strategic.challenge": {
    icon: ShieldQuestion,
    label: "Challenge",
    tone: "coral",
  },
  "strategic.judge": { icon: Scale, label: "Judge", tone: "green" },
  council: { icon: Sparkles, label: "Creative Council", tone: "indigo" },
};

export function specialistAccent(id: string) {
  const tone = specialistVisuals[id]?.tone ?? "cyan";
  return { ...accentVisuals[tone], tone };
}

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
    tone: "cyan" as const,
  };
  const accent = accentVisuals[visual.tone];
  const Icon = visual.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      data-accent={visual.tone}
    >
      <span
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-md border",
          accent.icon,
        )}
      >
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      <span>{label ?? visual.label}</span>
    </span>
  );
}
