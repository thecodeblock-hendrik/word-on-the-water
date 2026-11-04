import { expect, test } from "@playwright/test";

async function columns(page: import("@playwright/test").Page) {
  const xs = await page
    .locator("#start ol > li")
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)));
  return new Set(xs).size;
}

test("steps are one, two or four across depending on width", async ({ page }) => {
  await page.goto("/");
  const width = page.viewportSize()!.width;
  const expected = width >= 1024 ? 4 : width >= 520 ? 2 : 1;
  expect(await columns(page)).toBe(expected);
});

test("Start here link lands on the section and Talk to someone points at contact", async ({
  page,
}) => {
  await page.goto("/#start");
  await expect(page.getByRole("heading", { level: 2, name: "Start here" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Talk to someone" })).toHaveAttribute(
    "href",
    "/#contact",
  );
});
