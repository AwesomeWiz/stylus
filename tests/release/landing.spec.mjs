import { test, expect } from "@playwright/test";

test("public landing, product tour and protected workspace entry", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "See the evidence behind product decisions",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https?:\/\/[^/]+\/?$/,
  );
  await page.getByRole("link", { name: "Explore the walkthrough" }).click();
  const evidence = page.getByRole("tab", { name: "Evidence", exact: true });
  await evidence.focus();
  for (const step of ["Hypothesis", "Experiment", "Tasks", "Learning"]) {
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: step, exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("link", {
        name: `View full-size ${step.toLowerCase()} capture`,
      }),
    ).toBeVisible();
  }
  const source = page.getByRole("link", { name: "View source evidence" });
  await source.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("figure", { name: /Source evidence EVID-1/ }),
  ).toBeFocused();
  await expect(evidence).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Learning" }).click();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  await expect(evidence).toHaveAttribute("aria-selected", "true");
  for (const route of ["/home", "/tasks", "/whiteboards", "/settings"]) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location, response.url()).pathname).toBe(
      "/login",
    );
  }
  for (const [label, path] of [
    ["Sign in", "/login"],
    ["Create an account", "/signup"],
  ]) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === path);
    await expect(
      page.getByLabel("Email address", { exact: true }),
    ).toBeVisible();
    await page.goto("/");
  }
});

test("a delayed Learning capture keeps the current step intact and respects a later selection", async ({
  page,
}) => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/product/learning*.webp", async (route) => {
    await pending;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const tab = (name) => page.getByRole("tab", { name, exact: true });
    await tab("Learning").click();
    await expect(tab("Evidence")).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tabpanel", { name: "Evidence" }).getByRole("img"),
    ).toBeVisible();
    await tab("Tasks").click();
    await expect(tab("Tasks")).toHaveAttribute("aria-selected", "true");
    release();
    await page.locator("#learning-panel img").evaluate((img) => img.decode());
    await expect(tab("Tasks")).toHaveAttribute("aria-selected", "true");
    await tab("Learning").click();
    await expect(
      page.getByRole("tabpanel", { name: "Learning" }),
    ).toBeVisible();
    expect(
      await page
        .locator("#learning-panel img")
        .evaluate((img) => img.naturalWidth),
    ).toBeGreaterThan(0);
  } finally {
    release();
  }
});

test.describe("walkthrough without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("Learning links directly to its visible source", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "See the evidence behind product decisions",
    );
    await expect(page.getByRole("link", { name: "Try Stylus" })).toBeVisible();
    const steps = page.getByRole("navigation", { name: "Walkthrough steps" });
    await steps.getByRole("link", { name: "Learning" }).click();
    await page.getByRole("link", { name: "View source evidence" }).click();
    await expect(page).toHaveURL(/#EVID-1$/);
    await expect(
      page.getByRole("figure", { name: /Source evidence EVID-1/ }),
    ).toBeVisible();
    await steps.getByRole("link", { name: "Hypothesis" }).click();
    await expect(
      page.getByRole("heading", { name: "Give people one clear first step" }),
    ).toBeVisible();
  });
});

test.describe("walkthrough with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("source retains keyboard focus and a static highlight", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Learning" }).click();
    const link = page.getByRole("link", { name: "View source evidence" });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.locator("#intro span").filter({ hasText: "evidence" }),
    ).toHaveCSS("animation-name", "none");
    const source = page.getByRole("figure", { name: /Source evidence EVID-1/ });
    await expect(source).toBeFocused();
    await expect(source).toHaveCSS("animation-name", "none");
    await expect(source).toHaveCSS("outline-style", "solid");
  });
});

test("desktop scroll follows the decision and permits a direct return to its source", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const scene = page.locator("[data-ready]");
  await scene.waitFor();
  for (const [index, name] of [
    "Evidence",
    "Hypothesis",
    "Experiment",
    "Tasks",
    "Learning",
  ].entries()) {
    await scene.evaluate((el, index) => {
      const distance =
        el.offsetHeight - el.querySelector("[data-stage]").offsetHeight;
      window.scrollTo(
        0,
        window.scrollY +
          el.getBoundingClientRect().top -
          30 +
          (distance * index) / 4,
      );
    }, index);
    await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
  await page.getByRole("link", { name: "View source evidence" }).click();
  await expect(page.locator("#EVID-1")).toBeFocused();
});

test("captures share a bounded stage and settle on one record across layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/");
  await expect(page.locator("#tasks-heading")).toHaveCount(1);
  const stage = page.locator("[data-stage]");
  const scene = page.locator("[data-ready]");
  await scene.waitFor();
  const tab = (name) => page.getByRole("tab", { name, exact: true });
  await tab("Tasks").click();
  await expect(tab("Tasks")).toHaveAttribute("aria-selected", "true");
  await tab("Learning").click();
  await expect(tab("Learning")).toHaveAttribute("aria-selected", "true");
  for (const width of [1280, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 820 });
    await expect(page.getByRole("tabpanel")).toHaveAccessibleName("Learning");
    await expect(stage.locator("figure:visible")).toHaveCount(1);
    const bounds = await stage.evaluate((el) => {
      const stage = el.getBoundingClientRect();
      const figures = [...el.querySelectorAll("figure")];
      const rects = figures.map((figure) => figure.getBoundingClientRect());
      const imagesFit = figures.every((figure, index) => {
        const image = figure.querySelector("img").getBoundingClientRect();
        const frame = rects[index];
        return (
          image.top >= frame.top - 1 &&
          image.bottom <= frame.bottom + 1 &&
          image.left >= frame.left - 1 &&
          image.right <= frame.right + 1
        );
      });
      return (
        imagesFit &&
        rects.every(
          (r) =>
            Math.abs(r.top - rects[0].top) < 1 &&
            Math.abs(r.left - rects[0].left) < 1 &&
            Math.abs(r.height - rects[0].height) < 1 &&
            r.top >= stage.top - 1 &&
            r.bottom <= stage.bottom + 1 &&
            r.left >= stage.left - 1 &&
            r.right <= stage.right + 1,
        )
      );
    });
    expect(bounds).toBe(true);
    const disjoint = await page
      .locator('[aria-labelledby="tasks-heading"]')
      .evaluate((el) => {
        const [a, b] = [...el.querySelectorAll("img")].map((img) =>
          img.getBoundingClientRect(),
        );
        return a.right <= b.left || a.bottom <= b.top;
      });
    expect(disjoint).toBe(true);
  }
  await page.locator("#boards-heading").scrollIntoViewIfNeeded();
  expect(
    await stage.evaluate(
      (el) =>
        el.getBoundingClientRect().bottom <=
        document
          .querySelector('[aria-labelledby="boards-heading"]')
          .getBoundingClientRect().top,
    ),
  ).toBe(true);
});
