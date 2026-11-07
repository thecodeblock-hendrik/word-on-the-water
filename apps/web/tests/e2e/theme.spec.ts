import { expect, test } from "@playwright/test";

import { themeToggle } from "./theme-helpers";

test("server renders the chosen theme from the cookie, with no flash", async ({ request }) => {
  const response = await request.get("/", { headers: { cookie: "theme=dark" } });
  expect(await response.text()).toMatch(/<html[^>]*data-theme="dark"/);
});

test("ignores an invalid theme cookie", async ({ request }) => {
  const response = await request.get("/", { headers: { cookie: "theme=sepia" } });
  expect(await response.text()).not.toMatch(/<html[^>]*data-theme/);
});

test("the toggle is the last item at the top right of the header from lg", async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, "a menu row below lg");
  await page.goto("/");
  const toggle = (await (await themeToggle(page)).boundingBox())!;
  const cta = (await page.getByRole("link", { name: /get the devotional/i }).boundingBox())!;
  const header = (await page.getByRole("banner").boundingBox())!;
  expect(toggle.x).toBeGreaterThan(cta.x + cta.width);
  expect(toggle.y + toggle.height).toBeLessThan(header.y + header.height);
  const rights = await page
    .locator("header :is(a, button)")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
  expect(toggle.x + toggle.width).toBeGreaterThanOrEqual(Math.max(...rights) - 1);
});

test("the toggle switches theme and remembers it after reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await (await themeToggle(page)).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(async () => (await page.context().cookies()).find((c) => c.name === "theme")?.value)
    .toBe("dark");
  // Over plain http (local and CI) the cookie must not be Secure, or WebKit on Linux drops it.
  const cookie = (await page.context().cookies()).find((c) => c.name === "theme");
  expect(cookie?.secure).toBe(false);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
