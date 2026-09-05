export type AccentTone =
  "amber" | "blue" | "coral" | "cyan" | "green" | "indigo" | "pink" | "violet";

export const accentVisuals: Record<
  AccentTone,
  { border: string; icon: string; surface: string; text: string }
> = {
  amber: {
    border: "border-tone-amber-border",
    icon: "bg-tone-amber-subtle text-tone-amber border-tone-amber-border",
    surface: "bg-tone-amber-subtle",
    text: "text-tone-amber",
  },
  blue: {
    border: "border-tone-blue-border",
    icon: "bg-tone-blue-subtle text-tone-blue border-tone-blue-border",
    surface: "bg-tone-blue-subtle",
    text: "text-tone-blue",
  },
  coral: {
    border: "border-tone-coral-border",
    icon: "bg-tone-coral-subtle text-tone-coral border-tone-coral-border",
    surface: "bg-tone-coral-subtle",
    text: "text-tone-coral",
  },
  cyan: {
    border: "border-tone-cyan-border",
    icon: "bg-tone-cyan-subtle text-tone-cyan border-tone-cyan-border",
    surface: "bg-tone-cyan-subtle",
    text: "text-tone-cyan",
  },
  green: {
    border: "border-tone-green-border",
    icon: "bg-tone-green-subtle text-tone-green border-tone-green-border",
    surface: "bg-tone-green-subtle",
    text: "text-tone-green",
  },
  indigo: {
    border: "border-tone-indigo-border",
    icon: "bg-tone-indigo-subtle text-tone-indigo border-tone-indigo-border",
    surface: "bg-tone-indigo-subtle",
    text: "text-tone-indigo",
  },
  pink: {
    border: "border-tone-pink-border",
    icon: "bg-tone-pink-subtle text-tone-pink border-tone-pink-border",
    surface: "bg-tone-pink-subtle",
    text: "text-tone-pink",
  },
  violet: {
    border: "border-tone-violet-border",
    icon: "bg-tone-violet-subtle text-tone-violet border-tone-violet-border",
    surface: "bg-tone-violet-subtle",
    text: "text-tone-violet",
  },
};

export function statusVisual(status: string) {
  if (["APPROVED", "COMPLETED", "READY", "SUCCEEDED"].includes(status))
    return accentVisuals.green;
  if (["CANCELLED", "FAILED"].includes(status)) return accentVisuals.coral;
  if (["PAUSED", "PARTIAL"].includes(status)) return accentVisuals.amber;
  if (["QUEUED", "RUNNING", "SYNTHESIZING"].includes(status))
    return accentVisuals.blue;
  if (["DRAFT", "IDEA", "PLANNING"].includes(status))
    return accentVisuals.violet;
  return accentVisuals.cyan;
}

export function priorityVisual(priority: string) {
  if (priority === "URGENT") return accentVisuals.coral;
  if (priority === "HIGH") return accentVisuals.amber;
  if (priority === "MEDIUM") return accentVisuals.cyan;
  return null;
}

export function marketingSignalVisual(type: string) {
  if (type.startsWith("REDDIT") || type.includes("AUDIENCE"))
    return accentVisuals.pink;
  if (type.startsWith("SOCIAL")) return accentVisuals.violet;
  if (type.startsWith("HN_") || type.includes("TREND"))
    return accentVisuals.amber;
  if (type.startsWith("ARTICLE") || type.includes("RESEARCH"))
    return accentVisuals.blue;
  if (type.startsWith("RSS")) return accentVisuals.green;
  return accentVisuals.cyan;
}
