import { expect, test } from "@playwright/test";

// Phones turned sideways: the menu is taller than the screen and must scroll.
const LANDSCAPE = [
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 932, height: 430 },
];

for (const viewport of LANDSCAPE) {
  test(`menu scrolls to its last row at ${viewport.width}x${viewport.height}`, async ({
    browser,
  }) => {
    const page = await (await browser.newContext({ viewport })).newPage();
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByTestId("mobile-menu");
    const box = (await menu.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

    const theme = menu.getByText("Theme");
    await theme.scrollIntoViewIfNeeded();
    const row = (await theme.boundingBox())!;
    expect(row.y + row.height).toBeLessThanOrEqual(viewport.height);
  });
}
