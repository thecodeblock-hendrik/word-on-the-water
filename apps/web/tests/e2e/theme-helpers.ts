import type { Page } from "@playwright/test";

/** The theme toggle: in the header bar from lg, in the opened menu below it. */
export async function themeToggle(page: Page) {
  const name = /switch between light and dark/i;
  if (page.viewportSize()!.width < 1024) {
    await page.getByRole("button", { name: "Menu" }).click();
    return page.getByTestId("mobile-menu").getByRole("button", { name });
  }
  return page.getByRole("banner").getByRole("button", { name });
}
