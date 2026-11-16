import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
function luminance(hex: string) {
  return hex
    .slice(1)
    .match(/../g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0);
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
describe("shared theme contrast", () => {
  for (const selector of [":root", ".dark"]) {
    const start = css.indexOf(selector + " {");
    const block = css.slice(start, css.indexOf("\n}", start));
    const tokens = Object.fromEntries(
      [...block.matchAll(/--([\w-]+): (#[\da-f]{6});/g)].map((m) => [
        m[1],
        m[2],
      ]),
    );
    it(`${selector} keeps text and state pairs readable`, () => {
      for (const surface of ["background", "card", "muted", "popover"]) {
        for (const ink of [
          "foreground",
          "muted-foreground",
          "primary",
          "success",
          "warning",
          "destructive",
          "info",
        ]) {
          expect(
            contrast(tokens[ink], tokens[surface]),
            `${ink} / ${surface}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const action of ["primary", "primary-hover", "primary-active"])
        expect(
          contrast(tokens[action], tokens["primary-foreground"]),
          action,
        ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens.destructive, tokens["destructive-foreground"]),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens["accent-foreground"], tokens["sidebar-accent"]),
      ).toBeGreaterThanOrEqual(4.5);
      for (const status of ["success", "warning", "info"])
        expect(
          contrast(tokens[status], tokens[`${status}-subtle`]),
          status,
        ).toBeGreaterThanOrEqual(4.5);
    });
    it(`${selector} keeps control boundaries and focus visible`, () => {
      for (const surface of [
        "background",
        "card",
        "muted",
        "popover",
        "sidebar",
        "primary-subtle",
      ]) {
        for (const ink of ["input", "ring"])
          expect(
            contrast(tokens[ink], tokens[surface]),
            `${ink} / ${surface}`,
          ).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
