import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "src/app");
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : [join(dir, entry.name)],
  );
}
const source = (path: string) =>
  readFileSync(resolve(process.cwd(), "src", path), "utf8");

describe("workspace routing and loading architecture", () => {
  it("preserves all 30 unique public page paths across route groups", () => {
    const routes = files(root)
      .filter(
        (file) => file.endsWith("/page.tsx") || file.endsWith("\\page.tsx"),
      )
      .map(
        (file) =>
          "/" +
          relative(root, file)
            .split(/[\\/]/)
            .slice(0, -1)
            .filter((part) => !part.startsWith("("))
            .join("/"),
      );
    expect(routes).toHaveLength(30);
    expect(new Set(routes).size).toBe(30);
    expect(routes).toEqual(
      expect.arrayContaining([
        "/",
        "/tasks",
        "/whiteboards",
        "/whiteboards/[boardId]",
        "/login",
        "/signup",
        "/onboarding/[step]",
        "/invite/[token]",
        "/auth/error",
        "/apps/marketing/council",
        "/apps/marketing/performance",
        "/apps/example",
      ]),
    );
  });
  it("puts workspace pages below one shell while preserving the future editor boundary", () => {
    const pages = files(join(root, "(workspace)")).filter((file) =>
      file.endsWith("page.tsx"),
    );
    for (const file of pages)
      expect(readFileSync(file, "utf8"), file).not.toContain("<AppShell");
    expect(source("app/(workspace)/layout.tsx")).toContain("<AppShell");
    expect(source("app/whiteboards/[boardId]/page.tsx")).toContain("<AppShell");
    expect(source("components/marketing/marketing-page.tsx")).not.toContain(
      "getNotificationSummary",
    );
    for (const name of [
      "tasks",
      "activity",
      "ai",
      "jobs",
      "apps",
      "team",
      "settings",
      "whiteboards",
    ]) {
      const page = source(`app/(workspace)/${name}/page.tsx`);
      expect(page, name).toContain("getWorkspaceContext()");
      expect(page, name).not.toContain("getOnboardingData");
      expect(page, name).not.toContain("getNotificationSummary");
    }
  });
  it("retains full company loaders, onboarding editing and direct plugin authorization", () => {
    expect(source("app/(workspace)/memory/page.tsx")).toContain(
      "getOnboardingData",
    );
    expect(source("app/(workspace)/company/profile/page.tsx")).toContain(
      "getCurrentOnboardingData",
    );
    expect(source("app/onboarding/[step]/page.tsx")).toContain(
      'query.edit === "1"',
    );
    expect(source("app/(workspace)/apps/marketing/council/page.tsx")).toContain(
      'requireEnabledPlugin("marketing")',
    );
    expect(source("app/(workspace)/workers/page.tsx")).toContain(
      "getCurrentOrganizationContext()",
    );
  });
  it("uses client navigation with pending feedback and keeps server registries out of client chrome", () => {
    expect(source("components/layout/navigation-link.tsx")).toContain(
      'from "next/link"',
    );
    expect(source("components/layout/navigation-link.tsx")).toContain(
      "useLinkStatus()",
    );
    expect(source("components/layout/sidebar.tsx")).not.toMatch(/<a\s/);
    const chrome = source("components/layout/workspace-chrome.tsx");
    expect(chrome).toContain("usePathname()");
    expect(chrome).not.toContain('from "@/plugins"');
    expect(source("components/layout/topbar.tsx")).not.toMatch(
      /SearchInput|backdrop-blur/,
    );
  });
});
