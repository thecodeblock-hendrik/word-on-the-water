import { expect, test, type Page } from "@playwright/test";

async function scrolledDown(page: Page) {
  await page.goto("/");
  await page.locator("#believe").scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
}

async function expectAtTop(page: Page) {
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page).toHaveURL(/\/#top$/);
}

test("the About link takes you to the top of the landing page", async ({ page }) => {
  await scrolledDown(page);
  if (page.viewportSize()!.width < 1024) {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "About" }).click();
  } else {
    await page
      .getByRole("navigation", { name: "Main", exact: true })
      .getByRole("link", { name: "About" })
      .click();
  }
  await expectAtTop(page);
});

test("the footer Our story link takes you to the top of the landing page", async ({ page }) => {
  await scrolledDown(page);
  await page
    .getByRole("navigation", { name: "About" })
    .getByRole("link", { name: "Our story" })
    .click();
  await expectAtTop(page);
});

test("who it is for lists three groups", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Who this is for").getByRole("term")).toHaveCount(3);
});

test("who-it-is-for labels sit above their text until lg, then beside it", async ({ page }) => {
  await page.goto("/");
  const term = (await page.getByLabel("Who this is for").getByRole("term").first().boundingBox())!;
  const detail = (await page
    .getByLabel("Who this is for")
    .getByRole("definition")
    .first()
    .boundingBox())!;
  if (page.viewportSize()!.width >= 1024) expect(detail.x).toBeGreaterThan(term.x + 60);
  else {
    expect(detail.x).toBe(term.x);
    expect(detail.y).toBeGreaterThan(term.y);
  }
});

test("about body copy is regular size: only the eyebrow and heading are display type", async ({
  page,
}) => {
  await page.goto("/");
  const sizes = await page
    .locator("#about p.font-serif")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).fontSize));
  expect(sizes.length).toBeGreaterThan(0);
  for (const size of sizes) expect(size).toBe("17px");
});

test("on a tablet (768px) the labels still sit above their text", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  await page.goto("/");
  const list = page.getByLabel("Who this is for");
  const term = (await list.getByRole("term").first().boundingBox())!;
  const detail = (await list.getByRole("definition").first().boundingBox())!;
  expect(detail.x).toBe(term.x);
  expect(detail.y).toBeGreaterThan(term.y);
});

test("below lg the full-width divider is hidden so the last row line is the only one", async ({
  page,
}) => {
  await page.goto("/");
  const last = page.locator("#about dl > div").last();
  const divider = page.locator("#about + hr");
  await expect(last).toHaveCSS("border-bottom-width", "1px");
  if (page.viewportSize()!.width < 1024) await expect(divider).toBeHidden();
  else await expect(divider).toBeVisible();
});
