import { expect, test } from "@playwright/test";

import { themeToggle } from "./theme-helpers";

test("viewport covers the notch and theme-color follows the device by default", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();
  expect(html).toMatch(/viewport-fit=cover/);
  expect(html).toMatch(
    /name="theme-color"[^>]*content="#fbf3e8"[^>]*media="\(prefers-color-scheme: light\)"/,
  );
  expect(html).toMatch(
    /name="theme-color"[^>]*content="#0f2233"[^>]*media="\(prefers-color-scheme: dark\)"/,
  );
});

test("a chosen theme sets a single theme-color", async ({ request }) => {
  const html = await (await request.get("/", { headers: { cookie: "theme=dark" } })).text();
  expect(html.match(/name="theme-color"/g)).toHaveLength(1);
  expect(html).toMatch(/name="theme-color"[^>]*content="#0f2233"/);
});

test("toggling updates the browser chrome colour at once", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await (await themeToggle(page)).click();
  const colors = await page
    .locator('meta[name="theme-color"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("content")));
  expect(colors.every((c) => c === "#0f2233")).toBe(true);
});

test("every control in the header and footer is at least 44px", async ({ page }) => {
  await page.goto("/");
  const controls = page.locator("header :is(a, button), footer :is(a, button)");
  const sizes = await controls.evaluateAll((els) =>
    els
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => [Math.round(r.width), Math.round(r.height)]),
  );
  expect(sizes.length).toBeGreaterThan(2);
  for (const [, height] of sizes) expect(height).toBeGreaterThanOrEqual(44);
});

test("motion is switched off when the reader prefers reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const behaviour = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollBehavior,
  );
  expect(behaviour).toBe("auto");
});
