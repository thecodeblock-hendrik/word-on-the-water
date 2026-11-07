import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const start = "/bible/bsb/john/3?v=16-18";

test.describe("desktop column (1024px and wider)", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "the column is shown from 1024px");

  test("shows the Bible, the books, the chapters and the verses beside the text", async ({
    page,
  }) => {
    await page.goto(start);
    const column = page.getByRole("complementary", { name: "Choose passage" });
    await expect(column).toBeVisible();
    await expect(column.getByRole("radio", { name: "BSB" })).toBeChecked();
    await expect(column.getByRole("radio", { name: /ESV soon/ })).toBeDisabled();
    await expect(column.getByRole("navigation", { name: "Books" }).getByRole("link")).toHaveCount(
      66,
    );
    await expect(
      column.getByRole("navigation", { name: "Chapters of John" }).getByRole("link"),
    ).toHaveCount(21);
    await expect(page.getByRole("heading", { level: 1, name: "John 3:16–18" })).toBeVisible();
    const box = await column.boundingBox();
    const text = await page.getByRole("article").boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(text!.x);
  });

  test("the current book is marked and scrolled into view in its list", async ({ page }) => {
    await page.goto(start);
    const column = page.getByRole("complementary", { name: "Choose passage" });
    const john = column.getByRole("link", { name: "John", exact: true });
    await expect(john).toHaveAttribute("aria-current", "true");
    await expect(john).toBeInViewport();
  });

  test("choosing the WEB keeps book, chapter and verses", async ({ page }) => {
    await page.goto(start);
    await page.getByRole("complementary").getByText("WEB", { exact: true }).click();
    await expect(page).toHaveURL("/bible/web/john/3?v=16-18");
    await expect(page.getByText("his only born Son")).toBeVisible();
  });

  test("a book link opens chapter 1 and a chapter link opens that chapter", async ({ page }) => {
    await page.goto(start);
    const column = page.getByRole("complementary", { name: "Choose passage" });
    await column.getByRole("link", { name: "Romans", exact: true }).click();
    await expect(page).toHaveURL("/bible/bsb/romans/1");
    await expect(page.getByRole("heading", { level: 1, name: "Romans 1" })).toBeVisible();
    await column
      .getByRole("navigation", { name: "Chapters of Romans" })
      .getByRole("link", { name: "8", exact: true })
      .click();
    await expect(page).toHaveURL("/bible/bsb/romans/8");
    await expect(page.getByRole("heading", { level: 1, name: "Romans 8" })).toBeVisible();
  });

  test("Show verses opens the chosen verses of this chapter", async ({ page }) => {
    await page.goto("/bible/bsb/john/3");
    const column = page.getByRole("complementary", { name: "Choose passage" });
    await column.getByText("Verses", { exact: true }).click();
    await column.getByRole("radio", { name: /Some verses/ }).click();
    const last = column.getByRole("group", { name: "Last verse" });
    for (let i = 0; i < 4; i++)
      await last.getByRole("button", { name: "Increase last verse" }).click();
    await column.getByRole("button", { name: "Show verses" }).click();
    await expect(page).toHaveURL("/bible/bsb/john/3?v=1-5");
    await expect(page.getByRole("heading", { level: 1, name: "John 3:1–5" })).toBeVisible();
  });

  test("after moving to another chapter the verses refer to the new chapter, not the old one", async ({
    page,
  }) => {
    await page.goto(start);
    const column = page.getByRole("complementary", { name: "Choose passage" });
    await column
      .getByRole("navigation", { name: "Chapters of John" })
      .getByRole("link", { name: "5", exact: true })
      .click();
    await expect(page).toHaveURL("/bible/bsb/john/5");
    await column.getByText("Verses", { exact: true }).click();
    await column.getByRole("radio", { name: /Some verses/ }).click();
    await column.getByRole("button", { name: "Show verses" }).click();
    await expect(page).toHaveURL("/bible/bsb/john/5?v=1");
  });

  test("the Bible switch, the chapters and the verses stay in view while the book list scrolls", async ({
    page,
  }) => {
    await page.goto("/bible/bsb/revelation/22");
    const column = page.getByRole("complementary", { name: "Choose passage" });
    await expect(column.getByRole("link", { name: "Revelation", exact: true })).toBeInViewport();
    await expect(column.getByRole("radiogroup", { name: "Bible version" })).toBeInViewport();
    await expect(
      column.getByRole("navigation", { name: "Chapters of Revelation" }),
    ).toBeInViewport();
  });

  test("with verses chosen the column grows, but the Bible switch and the current book stay in view", async ({
    page,
  }) => {
    await page.goto("/bible/bsb/revelation/22?v=1-3");
    const column = page.getByRole("complementary", { name: "Choose passage" });
    await expect(column.getByText("Whole chapter")).toBeVisible();
    await expect(column.getByRole("radiogroup", { name: "Bible version" })).toBeInViewport();
    await expect(column.getByRole("link", { name: "Revelation", exact: true })).toBeInViewport();
    expect(await column.evaluate((el) => el.scrollTop)).toBe(0);
  });

  test("books, chapters and buttons are at least 44px tall", async ({ page }) => {
    await page.goto(start);
    const column = page.getByRole("complementary", { name: "Choose passage" });
    const sizes = await column
      .locator("a:visible, button:visible, label:visible")
      .evaluateAll((els) =>
        els.map((el) => ({
          name: el.textContent?.trim().slice(0, 20),
          h: el.getBoundingClientRect().height,
        })),
      );
    expect(sizes.length).toBeGreaterThan(80);
    expect(sizes.filter(({ h }) => h < 43.5).map(({ name }) => name)).toEqual([]);
  });

  test("the column scrolls on its own when the page is scrolled, and stays on screen", async ({
    page,
  }) => {
    await page.goto("/bible/bsb/psalms/119");
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(page.getByRole("complementary", { name: "Choose passage" })).toBeInViewport();
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
      for (const path of [start, "/bible/web/psalms/3"]) {
        await page.goto(path);
        await expect(page.getByRole("complementary", { name: "Choose passage" })).toBeVisible();
        const { violations: found } = await new AxeBuilder({ page }).analyze();
        expect(
          found
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map((v) => `${v.id} ${v.nodes[0]?.target}`),
          `${scheme} ${path}`,
        ).toEqual([]);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }
    }
    expect(violations).toEqual([]);
  });
});

test.describe("below 1024px", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1024, "the column is hidden below 1024px");

  test("the column is not shown, and the bar with the passage and version buttons is", async ({
    page,
  }) => {
    await page.goto(start);
    await expect(page.getByRole("complementary", { name: "Choose passage" })).toBeHidden();
    await expect(page.getByRole("button", { name: /Change passage/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Bible version: BSB/ })).toBeVisible();
  });
});
