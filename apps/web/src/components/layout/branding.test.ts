import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");
const hash = (path: string) =>
  createHash("sha256")
    .update(readFileSync(resolve(process.cwd(), path)))
    .digest("hex");

describe("approved brand assets and self-hosted typography", () => {
  it("serves faithful approved artwork and both wordmark variants through the shared component", () => {
    for (const name of ["stylus-logo", "stylus-logo-light"]) {
      expect(hash(`public/brand/${name}.png`)).toBe(
        hash(`../../assets/brand/logos/${name}.png`),
      );
    }
    for (const name of ["stylus-mark-light", "stylus-mark-dark"]) {
      expect(hash(`public/brand/${name}.png`)).toBe(
        hash(`../../assets/brand/marks/${name}.png`),
      );
    }
    expect(hash("public/brand/stylus-mark.png")).toBe(
      "483eb723abe95c39d51bc8a19abddad51e322d6ffa931f9e67e5b3242204d337",
    );
    const logo = read("src/components/layout/brand-logo.tsx");
    expect(logo).toContain("/brand/stylus-logo-light.png");
    expect(logo).toContain("/brand/stylus-logo.png");
    expect(logo).toContain("/brand/stylus-mark.png");
    for (const component of ["layout/brand", "auth/auth-shell"])
      expect(read(`src/components/${component}.tsx`)).toContain("<BrandLogo");
    const css = read("src/app/globals.css");
    expect(css).toMatch(/\.dark \.brand-logo-light\s*\{\s*display: none/);
    expect(css).toMatch(/\.dark \.brand-logo-dark\s*\{\s*display: block/);
  });
  it("uses locally served licensed Geist and supplied app icons without a font CDN", () => {
    expect(read("public/fonts/geist/LICENSE.txt")).toContain(
      "SIL OPEN FONT LICENSE Version 1.1",
    );
    expect(hash("public/fonts/geist/Geist-Variable.woff2")).toBe(
      "e24cec106619c03f0b3519e31b9bc55e0d5e926b6a95b8d798cd8cef215b1505",
    );
    const css = read("src/app/globals.css");
    expect(css).toContain('"/fonts/geist/Geist-Variable.woff2"');
    expect(css).toMatch(/--font-sans:\s*"Geist", ui-sans-serif/);
    expect(css).toContain("font-display: swap");
    expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
    const layout = read("src/app/layout.tsx");
    for (const icon of [
      "favicon-32",
      "apple-touch-icon",
      "stylus-icon-192",
      "stylus-icon-512",
    ])
      expect(layout).toContain(`/brand/${icon}.png`);
  });
});
