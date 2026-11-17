import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
vi.mock("@/lib/env/server", () => ({
  serverEnv: { NEXT_PUBLIC_SITE_URL: "https://stylus.example" },
}));
import AboutPage, { metadata } from "./page";
import sitemap from "../sitemap";
import { getSessionRouteDecision } from "@/lib/supabase/proxy";

describe("public product SEO boundary", () => {
  it("publishes static product content with explicit indexing and canonical metadata", () => {
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe("https://stylus.example/about");
    expect(metadata.description).toContain("early-stage teams");
    const html = renderToStaticMarkup(<AboutPage />);
    expect(html).toContain("From evidence to execution.");
    expect(html).toContain('href="/login"');
    expect(html).not.toContain("Paper Orbit");
  });
  it("lists only public product content in the sitemap", () => {
    expect(sitemap()).toEqual([{ url: "https://stylus.example/about" }]);
  });
  it("keeps workspace authentication and inherited private noindex intact", () => {
    expect(getSessionRouteDecision("/about", false)).toBeNull();
    expect(getSessionRouteDecision("/", false)).toBe("/login");
    expect(getSessionRouteDecision("/tasks", false)).toBe("/login");
    const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain("robots: { index: false, follow: false }");
  });
});
