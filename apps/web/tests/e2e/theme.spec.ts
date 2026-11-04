import { expect, test } from "@playwright/test";

test("server renders the chosen theme from the cookie, with no flash", async ({ request }) => {
  const response = await request.get("/", { headers: { cookie: "theme=dark" } });
  expect(await response.text()).toMatch(/<html[^>]*data-theme="dark"/);
});

test("ignores an invalid theme cookie", async ({ request }) => {
  const response = await request.get("/", { headers: { cookie: "theme=sepia" } });
  expect(await response.text()).not.toMatch(/<html[^>]*data-theme/);
});

test("the footer toggle switches theme and remembers it after reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: /switch between light and dark/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(async () => (await page.context().cookies()).find((c) => c.name === "theme")?.value)
    .toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
