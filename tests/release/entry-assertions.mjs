import { expect } from "@playwright/test";

export async function assertReleaseEntry(entry, route) {
  // A streamed loading <main role="status"> is not the main landmark. Headings
  // can live in the Board header, outside that landmark; wait for one accessible
  // page heading rather than counting hidden loading headings in the DOM.
  await expect(entry.getByRole("main")).toBeVisible();
  await expect(entry.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(entry).toHaveURL(
    (url) => url.pathname === new URL(route, "http://localhost").pathname,
  );
  await expect(entry).not.toHaveTitle("Page not found — Stylus");
  await expect(
    entry.getByText("Something slipped out of place.", { exact: true }),
  ).toHaveCount(0);
}
