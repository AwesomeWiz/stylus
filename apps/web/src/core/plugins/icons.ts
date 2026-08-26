import { Blocks, FlaskConical, Megaphone, type LucideIcon } from "lucide-react";
import { createElement } from "react";

import type { PluginIconId } from "./public";

export const pluginIconRegistry = {
  blocks: Blocks,
  "flask-conical": FlaskConical,
  megaphone: Megaphone,
} satisfies Record<PluginIconId, LucideIcon>;

export function getPluginIcon(icon: PluginIconId) {
  return pluginIconRegistry[icon];
}

export function PluginIcon({
  className,
  icon,
}: {
  className?: string;
  icon: PluginIconId;
}) {
  if (icon === "flask-conical")
    return createElement(FlaskConical, { "aria-hidden": true, className });
  if (icon === "megaphone")
    return createElement(Megaphone, { "aria-hidden": true, className });
  return createElement(Blocks, { "aria-hidden": true, className });
}
