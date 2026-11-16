import { test, expect } from "@playwright/test";
import { assertReleaseEntry } from "./entry-assertions.mjs";

test("Board entry tolerates overlapping loading status and workspace landmarks", async ({
  page,
}) => {
  const route = "/whiteboards/semantic-landmark-fixture";
  await page.route(`**${route}`, async (request) => {
    await request.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><head><title>Fixture board — Stylus</title></head><body>
        <main role="status" aria-label="Loading board"><h1>Loading board</h1></main>
        <header><h1>Fixture board</h1></header>
        <main aria-label="Board workspace"><p>Board content</p></main>
      </body></html>`,
    });
  });
  await page.goto(route);
  await expect(page.locator("main")).toHaveCount(2);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveAccessibleName("Board workspace");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(2);

  const ready = assertReleaseEntry(page, route);
  // Keep both DOM trees, as streaming can do, but finish the transient loading
  // state explicitly. No timer or application request is involved in this fixture.
  await page
    .getByRole("status", { name: "Loading board", exact: true })
    .evaluate((element) => {
      element.hidden = true;
    });
  await ready;
  await expect(page.locator("main")).toHaveCount(2);
  await expect(page.locator("h1")).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fixture board",
  );
});
