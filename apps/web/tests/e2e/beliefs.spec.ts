import { expect, test } from "@playwright/test";

test("What we believe link lands on the statement below the sticky header", async ({ page }) => {
  await page.goto("/#believe");
  const heading = page.getByRole("heading", { level: 2, name: /simple, historic faith/i });
  await expect(heading).toBeInViewport();
  await expect(page.getByRole("heading", { level: 2, name: /meet the writer/i })).toBeAttached();
});

test("beliefs and founder sit side by side only from lg", async ({ page }) => {
  await page.goto("/");
  const beliefsX = (await page.locator("#believe").boundingBox())!.x;
  const founderX = (await page.locator("#founder").boundingBox())!.x;
  if (page.viewportSize()!.width >= 1024) expect(founderX).toBeGreaterThan(beliefsX + 100);
  else expect(founderX).toBe(beliefsX);
});

test("the founder frame is 4:5 and the page does not scroll sideways", async ({ page }) => {
  await page.goto("/#founder");
  const box = (await page.getByTestId("founder-photo").boundingBox())!;
  expect(box.height / box.width).toBeCloseTo(1.25, 1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
