import { expect, test } from "@playwright/test";

test("the About link lands on the heading, not hidden under the sticky header", async ({
  page,
}) => {
  await page.goto("/");
  const width = page.viewportSize()!.width;
  if (width < 1024) {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "About" }).click();
  } else {
    await page
      .getByRole("navigation", { name: "Main", exact: true })
      .getByRole("link", { name: "About" })
      .click();
  }
  const heading = page.getByRole("heading", { level: 2, name: /faith that holds/i });
  await expect(heading).toBeInViewport();
  await expect(page).toHaveURL(/#about$/);
  await expect
    .poll(async () => (await heading.boundingBox())!.y)
    .toBeGreaterThanOrEqual((await page.getByRole("banner").boundingBox())!.height);
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

test("below lg the last who-it-is-for row has no bottom line above the section divider", async ({
  page,
}) => {
  test.skip(page.viewportSize()!.width >= 1024, "side by side from lg");
  await page.goto("/");
  const last = page.locator("#about dl > div").last();
  await expect(last).toHaveCSS("border-bottom-width", "0px");
});
