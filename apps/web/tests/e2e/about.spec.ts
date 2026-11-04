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
