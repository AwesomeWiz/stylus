import type { CSSProperties } from "react";
import { z } from "zod";
export const boardFonts = [
  {
    id: "geist",
    label: "Geist",
    group: "Sans serif",
    css: "var(--font-sans)",
    italic: false,
    weights: [400, 500, 600, 700],
  },
  {
    id: "manrope",
    label: "Manrope",
    group: "Sans serif",
    css: '"Stylus Board Manrope", sans-serif',
    italic: false,
    weights: [400, 500, 600, 700],
  },
  {
    id: "plus-jakarta-sans",
    label: "Plus Jakarta Sans",
    group: "Sans serif",
    css: '"Stylus Board Plus Jakarta Sans", sans-serif',
    italic: true,
    weights: [400, 500, 600, 700],
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    group: "Sans serif",
    css: '"Stylus Board Space Grotesk", sans-serif',
    italic: false,
    weights: [400, 500, 600, 700],
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    group: "Sans serif",
    css: '"Stylus Board DM Sans", sans-serif',
    italic: true,
    weights: [400, 500, 600, 700],
  },
  {
    id: "sora",
    label: "Sora",
    group: "Sans serif",
    css: '"Stylus Board Sora", sans-serif',
    italic: false,
    weights: [400, 500, 600, 700],
  },
  {
    id: "outfit",
    label: "Outfit",
    group: "Sans serif",
    css: '"Stylus Board Outfit", sans-serif',
    italic: false,
    weights: [400, 500, 600, 700],
  },
  {
    id: "lora",
    label: "Lora",
    group: "Serif",
    css: '"Stylus Board Lora", Georgia, serif',
    italic: true,
    weights: [400, 500, 600, 700],
  },
  {
    id: "fraunces",
    label: "Fraunces",
    group: "Serif",
    css: '"Stylus Board Fraunces", Georgia, serif',
    italic: true,
    weights: [400, 500, 600, 700],
  },
  {
    id: "libre-baskerville",
    label: "Libre Baskerville",
    group: "Serif",
    css: '"Stylus Board Libre Baskerville", Georgia, serif',
    italic: true,
    weights: [400, 700],
  },
  {
    id: "cormorant-garamond",
    label: "Cormorant Garamond",
    group: "Serif",
    css: '"Stylus Board Cormorant Garamond", Georgia, serif',
    italic: true,
    weights: [400, 500, 600, 700],
  },
  {
    id: "bebas-neue",
    label: "Bebas Neue",
    group: "Display",
    css: '"Stylus Board Bebas Neue", sans-serif',
    italic: false,
    weights: [400],
  },
  {
    id: "playfair-display",
    label: "Playfair Display",
    group: "Display",
    css: '"Stylus Board Playfair Display", Georgia, serif',
    italic: true,
    weights: [400, 500, 600, 700],
  },
  {
    id: "geist-mono",
    label: "Geist Mono",
    group: "Monospace",
    css: '"Stylus Board Mono", monospace',
    italic: false,
    weights: [400, 500, 600, 700],
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    group: "Monospace",
    css: '"Stylus Board JetBrains Mono", monospace',
    italic: true,
    weights: [400, 500, 600, 700],
  },
] as const;
export type BoardFontId = (typeof boardFonts)[number]["id"];
export function nearestBoardWeight(family: string, value: number) {
  const weights: readonly number[] = (
    boardFonts.find((f) => f.id === family) ?? boardFonts[0]
  ).weights;
  return weights.reduce((closest, weight) =>
    Math.abs(weight - value) < Math.abs(closest - value) ? weight : closest,
  );
}
export const boardFontOptions = boardFonts.map((font) => ({
  value: font.id,
  label: font.label,
  group: font.group,
  preview: font.id === "geist" ? '"Geist", sans-serif' : font.css,
}));
export const boardTypographySchema = z.object({
  family: z.enum(
    boardFonts.map((f) => f.id) as [BoardFontId, ...BoardFontId[]],
  ),
  weight: z.union([
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
  ]),
  fontSize: z.number().finite().min(8).max(256),
  align: z.enum(["left", "center", "right"]),
  lineHeight: z.number().finite().min(0.8).max(3),
  letterSpacing: z.number().finite().min(-5).max(20),
  italic: z.boolean(),
  underline: z.boolean(),
  strikethrough: z.boolean(),
  verticalAlign: z.enum(["top", "middle", "bottom"]),
  sizing: z.enum(["auto", "fixed"]),
});
export function boardTypography(style: Record<string, unknown>) {
  const defaults = {
    family: "geist",
    weight: 400,
    fontSize: 18,
    align: "left",
    lineHeight: 1.4,
    letterSpacing: 0,
    italic: false,
    underline: false,
    strikethrough: false,
    verticalAlign: "top",
    sizing: "fixed",
  };
  const value = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    // Absent optional styles use validated defaults. Constructing eleven Zod
    // errors per text node made viewport entry/Section focus unnecessarily slow.
    if (style[key] === undefined) continue;
    const parsed = boardTypographySchema.shape[key].safeParse(style[key]);
    if (parsed.success) Object.assign(value, { [key]: parsed.data });
  }
  const parsed = boardTypographySchema.parse(value);
  return {
    ...parsed,
    weight: nearestBoardWeight(parsed.family, parsed.weight),
  };
}
export function boardTextStyle(style: Record<string, unknown>): CSSProperties {
  const text = boardTypography(style),
    family = boardFonts.find((f) => f.id === text.family)!;
  return {
    fontFamily: family.css,
    fontSize: text.fontSize,
    fontWeight: text.weight,
    fontStyle: text.italic && family.italic ? "italic" : "normal",
    fontSynthesis: "none",
    overflowWrap: "anywhere",
    textAlign: text.align,
    lineHeight: text.lineHeight,
    letterSpacing: text.letterSpacing,
    textDecoration:
      [
        text.underline ? "underline" : "",
        text.strikethrough ? "line-through" : "",
      ]
        .filter(Boolean)
        .join(" ") || "none",
  };
}
