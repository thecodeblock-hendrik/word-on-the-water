import { expect, test } from "@playwright/test";

// Plain (non-mobile) windows: a mobile profile widens its layout viewport to fit
// overflowing content, so it can never show a sideways scroll.
const WIDTHS = [320, 360, 375, 390, 414];
const PAGES = ["/", "/devotionals/advent-01-more-than-watchmen"];

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`${path} fits a ${width}px screen with its right margin intact`, async ({ browser }) => {
      const page = await (await browser.newContext({ viewport: { width, height: 800 } })).newPage();
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      const menu = await page.getByRole("button", { name: /menu/i }).boundingBox();
      expect(menu!.x + menu!.width).toBeLessThanOrEqual(width - 16);
    });
  }
}
