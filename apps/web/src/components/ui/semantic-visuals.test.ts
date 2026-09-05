import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  accentVisuals,
  marketingSignalVisual,
  priorityVisual,
  statusVisual,
} from "./semantic-visuals";

describe("semantic accent visuals", () => {
  it("maps product concepts through centralized semantic accents", () => {
    expect(priorityVisual("URGENT")).toBe(accentVisuals.coral);
    expect(statusVisual("SUCCEEDED")).toBe(accentVisuals.green);
    expect(statusVisual("RUNNING")).toBe(accentVisuals.blue);
    expect(marketingSignalVisual("REDDIT_COMMENT")).toBe(accentVisuals.pink);
    expect(marketingSignalVisual("ARTICLE_CONTENT")).toBe(accentVisuals.blue);
  });

  it("keeps primary actions and collaborator labels at WCAG AA contrast", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    const root = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
    const dark = css.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1];
    expect(root).toBeTruthy();
    expect(dark).toBeTruthy();
    for (const theme of [root!, dark!]) {
      expect(
        contrast(token(theme, "primary"), token(theme, "primary-foreground")),
      ).toBeGreaterThanOrEqual(4.5);
      for (const family of [
        "blue",
        "coral",
        "violet",
        "amber",
        "magenta",
        "green",
        "indigo",
        "red",
      ]) {
        expect(
          contrast(
            token(theme, `collaborator-${family}`),
            token(theme, `collaborator-on-${family}`),
          ),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("defines every accent family in light and dark theme scopes", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    for (const tone of Object.keys(accentVisuals)) {
      expect(css.match(new RegExp(`--tone-${tone}:`, "g"))).toHaveLength(2);
      expect(css.match(new RegExp(`--tone-${tone}-subtle:`, "g"))).toHaveLength(
        2,
      );
      expect(css.match(new RegExp(`--tone-${tone}-border:`, "g"))).toHaveLength(
        2,
      );
    }
  });
});

function token(css: string, name: string) {
  const value = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  if (!value) throw new Error(`Missing hex token --${name}`);
  return value;
}

function contrast(left: string, right: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(
      (index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255,
    );
    const [red, green, blue] = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
  };
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
