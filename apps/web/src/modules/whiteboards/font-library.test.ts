import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { boardFonts, nearestBoardWeight, boardTextStyle } from "./typography";
describe("curated Board font assets", () => {
  it("registers exactly the requested 15 families, categories and real exposed weights", () => {
    expect(boardFonts.map((f) => f.label)).toEqual([
      "Geist",
      "Manrope",
      "Plus Jakarta Sans",
      "Space Grotesk",
      "DM Sans",
      "Sora",
      "Outfit",
      "Lora",
      "Fraunces",
      "Libre Baskerville",
      "Cormorant Garamond",
      "Bebas Neue",
      "Playfair Display",
      "Geist Mono",
      "JetBrains Mono",
    ]);
    expect(
      boardFonts.reduce(
        (counts, f) => ((counts[f.group] = (counts[f.group] ?? 0) + 1), counts),
        {} as Record<string, number>,
      ),
    ).toEqual({ "Sans serif": 7, Serif: 4, Display: 2, Monospace: 2 });
    expect(nearestBoardWeight("bebas-neue", 700)).toBe(400);
    expect(nearestBoardWeight("libre-baskerville", 600)).toBe(700);
    expect(nearestBoardWeight("libre-baskerville", 500)).toBe(400);
    expect(
      boardTextStyle({ family: "bebas-neue", weight: 700, italic: true }),
    ).toMatchObject({
      fontWeight: 400,
      fontStyle: "normal",
      fontSynthesis: "none",
    });
  });
  it("ships unchanged local WOFF2 files, attribution and same-origin lazy CSS without imports/preloads", () => {
    const directory = path.resolve("public/fonts/boards"),
      manifest = JSON.parse(
        fs.readFileSync(path.join(directory, "sources.json"), "utf8"),
      ),
      css = fs.readFileSync(
        path.resolve("src/components/whiteboards/board-content-fonts.css"),
        "utf8",
      );
    for (const font of manifest.fonts) {
      const data = fs.readFileSync(path.join(directory, font.file));
      expect(data.subarray(0, 4).toString()).toBe("wOF2");
      expect(data.length).toBe(font.bytes);
      expect(crypto.createHash("sha256").update(data).digest("hex")).toBe(
        font.sha256,
      );
      expect(new URL(font.source).hostname).toBe("fonts.gstatic.com");
      expect(css).toContain(`/fonts/boards/${font.file}`);
    }
    for (const font of boardFonts.filter((f) => f.id !== "geist")) {
      expect(
        fs.readFileSync(path.join(directory, font.id + "-OFL.txt"), "utf8"),
      ).toMatch(/SIL OPEN FONT LICENSE/i);
    }
    expect(css).not.toMatch(/@import|https?:|preload/);
    expect(css.match(/font-display:\s*swap/g)?.length).toBeGreaterThanOrEqual(
      14,
    );
  });
});
