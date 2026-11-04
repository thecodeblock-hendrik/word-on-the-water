import { expect, test } from "@playwright/test";

async function family(page: import("@playwright/test").Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
}

test("body copy is Lora, headings Barlow Condensed, interface Barlow", async ({ page }) => {
  await page.goto("/");
  expect(await family(page, "section p.max-w-\\[52ch\\]")).toMatch(/lora/i);
  expect(await family(page, "#coming article p")).toMatch(/lora/i);
  expect(await family(page, "h2")).toMatch(/barlow condensed/i);
  expect(await family(page, "header nav a")).toMatch(/barlow/i);
  expect(await family(page, "header nav a")).not.toMatch(/condensed|lora/i);
  expect(await family(page, "footer")).toMatch(/barlow/i);
});

test("body text is 17px with a 1.65 line height", async ({ page }) => {
  await page.goto("/");
  const [fontSize, lineHeight] = await page
    .locator("body")
    .evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight]);
  expect(fontSize).toBe("17px");
  expect(parseFloat(lineHeight)).toBeCloseTo(17 * 1.65, 1);
});
