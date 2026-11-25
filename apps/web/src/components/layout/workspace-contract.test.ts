import { readFileSync, readdirSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { getSessionRouteDecision } from "@/lib/supabase/proxy";

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

const publicProductRoutes = ["/", "/about"];
const workspaceRoot = join(root, "(workspace)");
const workspaceRoutes = [
  "/activity",
  "/ai",
  "/apps",
  "/apps/example",
  "/apps/marketing",
  "/apps/marketing/campaigns",
  "/apps/marketing/competitors",
  "/apps/marketing/competitors/[competitorId]",
  "/apps/marketing/council",
  "/apps/marketing/creative-briefs",
  "/apps/marketing/creative-studio",
  "/apps/marketing/experiments",
  "/apps/marketing/hypotheses",
  "/apps/marketing/learn",
  "/apps/marketing/performance",
  "/apps/marketing/reel-ideas",
  "/apps/marketing/research",
  "/company/profile",
  "/home",
  "/jobs",
  "/memory",
  "/notes",
  "/settings",
  "/settings/integrations",
  "/tasks",
  "/team",
  "/whiteboards",
  "/workers",
];
const boardEditor = "/whiteboards/[boardId]";
const entryRoutes = ["/auth/error", "/invite/[token]", "/login", "/signup"];
const setupRoutes = ["/onboarding/[step]", "/organization/new"];

function pageRoutes(dir: string) {
  return files(dir)
    .filter((file) => basename(file) === "page.tsx")
    .map(
      (file) =>
        "/" +
        relative(root, file)
          .split(sep)
          .slice(0, -1)
          .filter((part) => !part.startsWith("("))
          .join("/"),
    );
}

describe("workspace routing and loading architecture", () => {
  it("matches the exact page URL inventory without duplicates", () => {
    const expectedRoutes = [
      ...publicProductRoutes,
      ...workspaceRoutes,
      ...entryRoutes,
      ...setupRoutes,
      boardEditor,
    ];
    const routes = pageRoutes(root);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.toSorted()).toEqual(expectedRoutes.toSorted());
    expect(pageRoutes(workspaceRoot).toSorted()).toEqual(
      workspaceRoutes.toSorted(),
    );
  });

  it("serves product pages outside the workspace and redirects signed-in root visits to Home", () => {
    expect(source("app/page.tsx")).toContain("<Walkthrough");
    for (const path of ["app/page.tsx", "app/about/page.tsx"]) {
      expect(source(path)).not.toMatch(/getWorkspaceContext|AppShell/);
    }
    for (const path of publicProductRoutes) {
      expect(getSessionRouteDecision(path, false), path).toBeNull();
    }
    expect(getSessionRouteDecision("/", true)).toBe("/home");
    expect(getSessionRouteDecision("/about", true)).toBeNull();
    expect(getSessionRouteDecision("/home", true)).toBeNull();
  });

  it("requires a session for workspace, Board and setup pages", () => {
    for (const path of [...workspaceRoutes, boardEditor, ...setupRoutes]) {
      expect(getSessionRouteDecision(path, false), path).toBe("/login");
    }
  });

  it("puts workspace pages below one shell and keeps the immersive editor outside it", () => {
    const pages = files(workspaceRoot).filter((file) =>
      file.endsWith("page.tsx"),
    );
    for (const file of pages)
      expect(readFileSync(file, "utf8"), file).not.toContain("<AppShell");
    expect(source("app/(workspace)/layout.tsx")).toContain("<AppShell");
    const editor = source("app/whiteboards/[boardId]/page.tsx");
    expect(editor).toContain("<BoardShell");
    expect(editor).toContain("getWorkspaceContext()");
    expect(editor).not.toMatch(/AppShell|getNotificationSummary/);
    const boardShell = source("components/whiteboards/board-shell.tsx");
    expect(boardShell).not.toMatch(/import.*AppShell|getNotificationSummary/);
    expect(source("components/marketing/marketing-page.tsx")).not.toContain(
      "getNotificationSummary",
    );
    for (const name of [
      "home",
      "tasks",
      "notes",
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
