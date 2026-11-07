import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const start = "/bible/bsb/john/3?v=16-18";

test.describe("columns picker (1024px and wider)", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "the popover is shown from 1024px");

  async function open(page: import("@playwright/test").Page, path = start) {
    await page.goto(path);
    await page.getByRole("button", { name: /Change passage/ }).click();
    return page.getByRole("dialog", { name: "Choose passage" });
  }

  test("shows the Bible, books, chapters and verses side by side, with the current choice marked", async ({
    page,
  }) => {
    const picker = await open(page);
    await expect(picker.getByRole("radio", { name: "BSB" })).toBeChecked();
    await expect(picker.getByRole("radio", { name: "ESV" })).toBeDisabled();
    await expect(picker.getByRole("navigation", { name: "Books" }).getByRole("button")).toHaveCount(
      66,
    );
    const john = picker.getByRole("button", { name: "John", exact: true });
    await expect(john).toHaveAttribute("aria-current", "true");
    await expect(john).toBeInViewport();
    await expect(picker.getByRole("button", { name: /^Chapter \d+$/ })).toHaveCount(21);
    await expect(picker.getByRole("button", { name: "Verse 17" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(picker.getByRole("button", { name: "Verse 19" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("choose a book, a chapter and a range of verses, then Read", async ({ page }) => {
    const picker = await open(page);
    await picker.getByRole("button", { name: "Romans", exact: true }).click();
    await picker.getByRole("button", { name: "Chapter 8" }).click();
    await picker.getByRole("button", { name: "Verse 28" }).click();
    await picker.getByRole("button", { name: "Verse 30" }).click();
    await picker.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/bsb/romans/8?v=28-30");
    await expect(page.getByRole("heading", { level: 1, name: "Romans 8:28–30" })).toBeVisible();
  });

  test("one click on a verse reads just that verse", async ({ page }) => {
    const picker = await open(page, "/bible/bsb/john/3");
    await picker.getByRole("button", { name: "Verse 16" }).click();
    await picker.getByRole("button", { name: "Verse 16" }).click();
    await picker.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/bsb/john/3?v=16");
  });

  test("Whole chapter clears the verses, and the first and last verse together still read as verses", async ({
    page,
  }) => {
    const picker = await open(page);
    await picker.getByRole("button", { name: "Whole chapter" }).click();
    await picker.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/bsb/john/3");
    await page.getByRole("button", { name: /Change passage/ }).click();
    await picker.getByRole("button", { name: "Verse 1", exact: true }).click();
    await picker.getByRole("button", { name: "Verse 36" }).click();
    await picker.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/bsb/john/3?v=1-36");
  });

  test("choosing the WEB keeps book, chapter and verses", async ({ page }) => {
    const picker = await open(page);
    await picker.getByText("WEB", { exact: true }).click();
    await picker.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/web/john/3?v=16-18");
  });

  test("typing filters the books, and Psalms chapters come in pages of 25", async ({ page }) => {
    const picker = await open(page);
    await picker.getByRole("searchbox", { name: "Find a book" }).fill("psa");
    await picker.getByRole("button", { name: "Psalms", exact: true }).click();
    await expect(picker.getByRole("button", { name: "Chapter 25" })).toBeVisible();
    await picker.getByRole("tab", { name: "101 to 125" }).click();
    await picker.getByRole("button", { name: "Chapter 119" }).click();
    await expect(picker.getByRole("button", { name: "Verse 176" })).toBeVisible();
  });

  test("closing without Read drops the choices", async ({ page }) => {
    const picker = await open(page);
    await picker.getByRole("button", { name: "Mark", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(start);
    await page.getByRole("button", { name: /Change passage/ }).click();
    await expect(picker.getByRole("button", { name: "John", exact: true })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("controls are at least 44px tall and the picker fits the screen", async ({ page }) => {
    const picker = await open(page);
    const sizes = await picker
      .locator("button:visible, label:visible, input[type=search]:visible")
      .evaluateAll((els) =>
        els.map((el) => ({
          name: el.textContent?.trim().slice(0, 20),
          h: el.getBoundingClientRect().height,
        })),
      );
    expect(sizes.filter(({ h }) => h < 43.5).map(({ name }) => name)).toEqual([]);
    await expect(picker.getByRole("button", { name: "Read" })).toBeInViewport();
  });

  test("no CSP violation, no sideways scroll and no serious axe problem, in light and dark", async ({
    page,
  }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (m.text().includes("Content Security Policy")) violations.push(m.text());
    });
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      const { violations: found } = await new AxeBuilder({ page }).analyze();
      expect(
        found
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id} ${v.nodes[0]?.target}`),
        scheme,
      ).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
    expect(violations).toEqual([]);
  });
});

test.describe("below 1024px", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1024, "the sheet is used below 1024px");

  test("the passage and version buttons are shown, and the picker is the sheet", async ({
    page,
  }) => {
    await page.goto(start);
    await expect(page.getByRole("button", { name: /Change passage/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Bible version: BSB/ })).toBeVisible();
  });
});
