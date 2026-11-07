import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The chip lives in the bar below 1024px; the desktop column has its own version control.
test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1024, "the desktop column replaces the chip");

const page16 = "/bible/bsb/john/3?v=16-18";
const chip = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Bible version: BSB. Change" });

test("the chip opens the version sheet with the three Bibles and the ESV as Coming soon", async ({
  page,
}) => {
  await page.goto(page16);
  await chip(page).click();
  const sheet = page.getByRole("dialog", { name: "Choose Bible" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("radio")).toHaveCount(3);
  await expect(sheet.getByRole("radio", { name: /Berean Standard Bible/ })).toBeChecked();
  await expect(sheet.getByRole("radio", { name: /English Standard Version/ })).toBeDisabled();
  await expect(sheet.getByText("Coming soon")).toBeVisible();
});

test("choosing the WEB keeps the passage: same book, chapter and verses", async ({ page }) => {
  await page.goto(page16);
  await chip(page).click();
  await page.getByRole("radio", { name: /World English Bible/ }).click();
  await expect(page).toHaveURL("/bible/web/john/3?v=16-18");
  await expect(page.getByRole("heading", { level: 1, name: "John 3:16–18" })).toBeVisible();
  await expect(page.getByText("his only born Son")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bible version: WEB. Change" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("switching on a chapter the other Bible numbers differently falls back with a note", async ({
  page,
}) => {
  await page.goto("/bible/web/romans/14?v=24-26");
  await page.getByRole("button", { name: "Bible version: WEB. Change" }).click();
  await page.getByRole("radio", { name: /Berean Standard Bible/ }).click();
  await expect(page).toHaveURL("/bible/bsb/romans/14?v=24-26");
  await expect(page.getByRole("note")).toContainText(
    "Verses 24–26 are not in the Berean Standard Bible",
  );
});

test("Escape closes the sheet without changing anything and returns focus to the chip", async ({
  page,
}) => {
  await page.goto(page16);
  await chip(page).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(page16);
  await expect(chip(page)).toBeFocused();
});

test("focus stays inside the open sheet", async ({ page }) => {
  await page.goto(page16);
  await chip(page).click();
  const sheet = page.getByRole("dialog");
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
});

test("every control is at least 44px tall", async ({ page }) => {
  await page.goto(page16);
  const trigger = await chip(page).boundingBox();
  expect(trigger!.height).toBeGreaterThanOrEqual(44);
  await chip(page).click();
  const sheet = page.getByRole("dialog");
  const close = await sheet.getByRole("button", { name: "Close" }).boundingBox();
  expect(close!.height).toBeGreaterThanOrEqual(44);
  expect(close!.width).toBeGreaterThanOrEqual(44);
  for (const card of await sheet.locator("label").all()) {
    expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test("opening the sheet causes no CSP violation and no serious axe problem, in light and dark", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (m.text().includes("Content Security Policy")) violations.push(m.text());
  });
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(page16);
    await chip(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const { violations: found } = await new AxeBuilder({ page }).analyze();
    expect(
      found.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
      scheme,
    ).toEqual([]);
    await page.keyboard.press("Escape");
  }
  expect(violations).toEqual([]);
});

test.describe("tablet width on a desktop browser", () => {
  test.skip(({ isMobile }) => isMobile, "phones are covered above");
  test.use({ viewport: { width: 800, height: 900 } });

  test("the chip opens a centred card, and choosing the WEB keeps the passage", async ({
    page,
  }) => {
    await page.goto(page16);
    await chip(page).click();
    const sheet = page.getByRole("dialog", { name: "Choose Bible" });
    const box = await sheet.boundingBox();
    expect(box!.width).toBeLessThan(800);
    expect(box!.y).toBeGreaterThan(0);
    await sheet.getByRole("radio", { name: /World English Bible/ }).click();
    await expect(page).toHaveURL("/bible/web/john/3?v=16-18");
  });
});
