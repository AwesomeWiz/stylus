import type { CSSProperties } from "react";
import { z } from "zod";
export const boardFonts = [
  { id: "geist", label: "Geist", css: "var(--font-sans)", italic: false },
  {
    id: "lora",
    label: "Lora",
    css: '"Stylus Board Lora", Georgia, serif',
    italic: true,
  },
  {
    id: "geist-mono",
    label: "Geist Mono",
    css: '"Stylus Board Mono", monospace',
    italic: false,
  },
] as const;
export const boardTypographySchema = z.object({
  family: z.enum(["geist", "lora", "geist-mono"]),
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
  return boardTypographySchema.parse(value);
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
