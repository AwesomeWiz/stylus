import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

async function accessibility(page) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const report = await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
      },
    });
    return report.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    }));
  });
  expect(result).toEqual([]);
}

test("public recovery and authentication semantics", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/missing-release-check");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This page isn’t on the board.",
  );
  await expect(page).toHaveTitle("Page not found — Stylus");
  await page.bringToFront();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await accessibility(page);
  await page.keyboard.press("Enter");
  await expect(page.locator("#error-main")).toBeFocused();
  await page.goto("/login");
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await accessibility(page);
  expect(errors).toEqual([]);
});

test("authenticated fictional Core and growth workflow", async ({ page }) => {
  if (!fs.existsSync(".release-qa/demo.json"))
    throw Error(
      "Authenticated release QA requires the explicit fictional demo; it is not skipped",
    );
  const demo = JSON.parse(fs.readFileSync(".release-qa/demo.json", "utf8"));
  if (demo.state !== "ready") throw Error("Fictional demo is incomplete");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(demo.users[0].email);
  await page.getByLabel("Password", { exact: true }).fill(demo.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");
  // This inventory deliberately uses document entrypoints. Let each page's
  // bounded prefetches finish before tearing its document down; real Link
  // navigation is checked separately. Keep the pageerror assertion enabled.
  await page.waitForLoadState("networkidle");
  for (const route of [
    "/",
    "/tasks?view=all",
    "/tasks?milestones=1",
    "/notes",
    "/apps/marketing",
    `/apps/marketing/hypotheses?item=${demo.ids.hypothesis}`,
    `/apps/marketing/experiments?item=${demo.ids.experiment}`,
    "/apps/marketing/learn",
    "/memory",
    "/settings/integrations",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveURL(
      (url) => url.pathname === new URL(route, "http://localhost").pathname,
    );
    await expect(page).not.toHaveTitle("Page not found — Stylus");
    await expect(
      page.getByText("Something slipped out of place.", { exact: true }),
    ).toHaveCount(0);
    await page.waitForLoadState("networkidle");
  }
  await page.goto(`/tasks?view=all&task=${demo.ids.tasks[1]}`);
  await expect(
    page.getByRole("heading", {
      name: "Instrument first-session completion",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Task prerequisites and milestone" }),
  ).toBeVisible();
  await expect(
    page.getByText("Loading related work…", { exact: true }),
  ).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Back to list", exact: true }).click();
  await page.goto(`/whiteboards/${demo.ids.board}`);
  await expect(page.getByLabel("Board canvas", { exact: true })).toBeVisible();
  await page.locator('summary[aria-label="Shapes"]').click();
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const canvas = await page
    .getByLabel("Board canvas", { exact: true })
    .boundingBox();
  if (!canvas) throw Error("Canvas geometry missing");
  await page.mouse.move(canvas.x + 500, canvas.y + 350);
  await expect(page.locator("[data-board-placement]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-board-placement]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("responsive public surfaces and reduced motion", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of info.project.name === "chromium"
    ? [320, 390, 430, 768, 1024, 1200, 1440, 1920]
    : [390, 1024, 1600]) {
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("stylus-theme", value),
        theme,
      );
      for (const route of ["/login", "/missing-release-check"]) {
        await page.goto(route);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        if (width === 390) await accessibility(page);
      }
    }
  }
});
