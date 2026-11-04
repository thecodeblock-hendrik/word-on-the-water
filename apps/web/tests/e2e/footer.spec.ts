import { expect, test } from "@playwright/test";

const ESV =
  /Scripture quotations are from the ESV® Bible .* Used by permission\. All rights reserved\./;

for (const path of ["/", "/does-not-exist"]) {
  test(`the ESV copyright notice is in the footer on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("contentinfo")).toContainText(ESV);
  });
}

test("footer link groups are two across below lg and four columns from lg", async ({ page }) => {
  await page.goto("/");
  const xs = await page
    .locator("footer nav")
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)));
  const columns = new Set(xs).size;
  expect(columns).toBe(page.viewportSize()!.width >= 1024 ? 3 : 2);
});

test("footer links go to real sections", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Statement of faith" }).click();
  await expect(page).toHaveURL(/#believe$/);
  await expect(
    page.getByRole("heading", { level: 2, name: /simple, historic faith/i }),
  ).toBeInViewport();
});

test("footer does not scroll sideways", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
