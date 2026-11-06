import { expect, test } from "@playwright/test";

test("Devotionals link lands on What's coming and the latest devotional is shown", async ({
  page,
}) => {
  await page.goto("/#coming");
  await expect(
    page.getByRole("heading", { level: 2, name: /read it before the paddle out/i }),
  ).toBeInViewport();
  await expect(page.getByRole("region", { name: /devotional preview/i })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("the section does not scroll sideways", async ({ page }) => {
  await page.goto("/#coming");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
