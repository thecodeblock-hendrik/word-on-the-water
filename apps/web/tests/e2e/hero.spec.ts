import { expect, test } from "@playwright/test";

// Plain (non-mobile) windows so the width is exactly what is asked for.
const hero = "section[aria-labelledby=hero-verse]";

for (const width of [375, 600, 767]) {
  test(`at ${width}px the hero logo is gone and the text sits just under the menu bar`, async ({
    browser,
  }) => {
    const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
    await page.goto("/");
    await expect(page.locator(`${hero} [aria-label^="Word on the Water logo"]`)).toBeHidden();
    const header = (await page.locator("header").boundingBox())!;
    const eyebrow = (await page.locator(`${hero} p`).first().boundingBox())!;
    expect(eyebrow.y - (header.y + header.height)).toBeLessThanOrEqual(40);
  });
}

for (const width of [768, 1024, 1280]) {
  test(`at ${width}px the hero logo is shown beside the text`, async ({ browser }) => {
    const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
    await page.goto("/");
    const logo = page.locator(`${hero} [aria-label^="Word on the Water logo"]`);
    await expect(logo).toBeVisible();
    const text = (await page.locator(`${hero} blockquote`).boundingBox())!;
    expect((await logo.boundingBox())!.x).toBeGreaterThan(text.x + text.width);
  });
}
