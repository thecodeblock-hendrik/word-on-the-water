import { expect, test } from "@playwright/test";

test("small screens use the menu, large screens show the links", async ({ page, isMobile }) => {
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Menu" });
  const nav = page.getByRole("navigation", { name: "Main", exact: true });
  const width = page.viewportSize()!.width;
  if (width < 1024) {
    await expect(menuButton).toBeVisible();
    await expect(nav).toBeHidden();
  } else {
    await expect(menuButton).toBeHidden();
    await expect(nav).toBeVisible();
  }
  expect(isMobile === width < 1024).toBe(true);
});

test("menu opens, closes with Escape and returns focus", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 1024, "menu is for small screens");
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menu" });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("mobile-menu").getByRole("link")).toHaveCount(6);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("mobile-menu")).toBeHidden();
  await expect(button).toBeFocused();
});

test("header stays sticky and does not overflow at 375px", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.getByRole("banner").boundingBox();
  expect(box?.y).toBe(0);
});

test("open menu fits the screen with no sideways scroll", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 1024, "menu is for small screens");
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByTestId("mobile-menu");
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  expect(box.x).toBe(0);
  expect(box.width).toBe(page.viewportSize()!.width);
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
});
