import { expect, test } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("small screens still show every link, and the dead menu button is hidden", async ({
    page,
  }) => {
    test.skip(page.viewportSize()!.width >= 1024, "large screens show the normal nav");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main", exact: true });
    const links = nav.getByRole("link");
    await expect(links).toHaveCount(5);
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("large screens show the normal nav", async ({ page }) => {
    test.skip(page.viewportSize()!.width < 1024, "small screens use the fallback");
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: "Main", exact: true }).getByRole("link"),
    ).toHaveCount(5);
  });
});

test("with JavaScript the fallback links are not shown and the menu button works", async ({
  page,
}) => {
  test.skip(page.viewportSize()!.width >= 1024, "menu is for small screens");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main", exact: true })).toBeHidden();
});
