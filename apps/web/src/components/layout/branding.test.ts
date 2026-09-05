import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Stylus branding", () => {
  it("uses the optimized approved mark in shell, auth, and icon metadata", () => {
    const mark = resolve(process.cwd(), "public/brand/stylus-mark.png");
    const shell = readFileSync(
      resolve(process.cwd(), "src/components/layout/brand.tsx"),
      "utf8",
    );
    const auth = readFileSync(
      resolve(process.cwd(), "src/components/auth/auth-shell.tsx"),
      "utf8",
    );
    const layout = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );
    expect(existsSync(mark)).toBe(true);
    expect(statSync(mark).size).toBeLessThan(100_000);
    expect(shell).toContain("/brand/stylus-mark.png");
    expect(auth).toContain("/brand/stylus-mark.png");
    expect(layout).toContain("/brand/stylus-mark.png");
  });
});
