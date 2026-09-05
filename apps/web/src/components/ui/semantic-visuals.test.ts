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
