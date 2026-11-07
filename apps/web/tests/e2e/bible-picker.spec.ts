import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const start = "/bible/bsb/john/3";
const trigger = (page: Page, name: RegExp = /Change passage/) => page.getByRole("button", { name });

test.describe("passage sheet (below 1024px)", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) >= 1024,
    "the desktop popover replaces the sheet",
  );

  test("opens on the Book tab, and the tabs show the current choice", async ({ page }) => {
    await page.goto(`${start}?v=16-18`);
    await trigger(page).click();
    const sheet = page.getByRole("dialog", { name: "Choose passage" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("tab", { name: "Book John" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(sheet.getByRole("tab", { name: "Chapter 3" })).toBeVisible();
    await expect(sheet.getByRole("tab", { name: "Verses 16–18" })).toBeVisible();
  });

  test("choose WEB, Romans, chapter 8, verses 28 to 30, then Read", async ({ page }) => {
    await page.goto("/bible/bsb/genesis/1");
    await trigger(page).click();
    const sheet = page.getByRole("dialog", { name: "Choose passage" });

    await sheet.getByRole("radio", { name: "WEB" }).check({ force: true });
    await sheet.getByRole("button", { name: "Romans", exact: true }).click();
    await expect(sheet.getByRole("tab", { name: "Chapter 1" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await sheet.getByRole("button", { name: "Chapter 8" }).click();
    await expect(sheet.getByRole("tab", { name: /^Verses/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await sheet.getByRole("button", { name: "Verse 28" }).click();
    await sheet.getByRole("button", { name: "Verse 30" }).click();
    await expect(sheet.getByRole("tab", { name: "Verses 28–30" })).toBeVisible();

    await sheet.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/web/romans/8?v=28-30");
    await expect(page.getByRole("heading", { level: 1, name: "Romans 8:28–30" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("one verse, and the whole chapter after choosing verses", async ({ page }) => {
    await page.goto(start);
    await trigger(page).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("tab", { name: /^Verses/ }).click();
    await sheet.getByRole("button", { name: "Verse 16" }).click();
    await sheet.getByRole("button", { name: "Verse 16" }).click();
    await sheet.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL(`${start}?v=16`);
    await trigger(page).click();
    await sheet.getByRole("button", { name: "Whole chapter" }).click();
    await sheet.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL(start);
  });

  test("a long book: Psalms 119 through the page tabs", async ({ page }) => {
    await page.goto(start);
    await trigger(page).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("searchbox", { name: "Find a book" }).fill("psa");
    await sheet.getByRole("button", { name: "Psalms", exact: true }).click();
    await sheet.getByRole("tab", { name: "101 to 125" }).click();
    await sheet.getByRole("button", { name: "Chapter 119" }).click();
    await sheet.getByRole("button", { name: "Whole chapter" }).click();
    await sheet.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/bsb/psalms/119");
  });

  test("Escape closes the sheet, changes nothing and returns focus to the trigger", async ({
    page,
  }) => {
    await page.goto(start);
    await trigger(page).click();
    await page.getByRole("dialog").getByRole("button", { name: "Romans", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(start);
    await expect(trigger(page)).toBeFocused();
  });

  test("focus stays inside the sheet", async ({ page }) => {
    await page.goto(start);
    await trigger(page).click();
    const sheet = page.getByRole("dialog");
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
  });

  test("every control in every tab is at least 44px and the footer stays in view", async ({
    page,
  }) => {
    await page.goto(`${start}?v=16-18`);
    await trigger(page).click();
    const sheet = page.getByRole("dialog");
    const tooSmall = async () => {
      const sizes = await sheet
        .locator("button:visible, label:visible, input[type=search]:visible")
        .evaluateAll((els) =>
          els.map((el) => ({
            name: el.textContent?.trim().slice(0, 20),
            h: el.getBoundingClientRect().height,
          })),
        );
      expect(sizes.length, "checked some controls").toBeGreaterThan(3);
      return sizes.filter(({ h }) => h < 43.5).map(({ name }) => name);
    };
    for (const tab of [/^Book/, /^Chapter/, /^Verses/]) {
      await sheet.getByRole("tab", { name: tab }).click();
      expect(await tooSmall(), String(tab)).toEqual([]);
      await expect(sheet.getByRole("button", { name: "Read" })).toBeInViewport();
    }
  });

  test("no sideways scrolling in any tab, even for Psalm 119", async ({ page }) => {
    await page.goto("/bible/bsb/psalms/119?v=1-3");
    await trigger(page).click();
    const sheet = page.getByRole("dialog");
    for (const tab of [/^Book/, /^Chapter/, /^Verses/]) {
      await sheet.getByRole("tab", { name: tab }).click();
      const overflow = await sheet.evaluate((el) => {
        const panel = el.querySelector("[role=tabpanel]") ?? el;
        return Math.max(el.scrollWidth - el.clientWidth, panel.scrollWidth - panel.clientWidth);
      });
      expect(overflow, String(tab)).toBeLessThanOrEqual(0);
    }
  });

  test("no CSP violation and no serious axe problem on any tab, in light and dark", async ({
    page,
  }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (m.text().includes("Content Security Policy")) violations.push(m.text());
    });
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${start}?v=16-18`);
      await trigger(page).click();
      const sheet = page.getByRole("dialog");
      for (const tab of [/^Book/, /^Chapter/, /^Verses/]) {
        await sheet.getByRole("tab", { name: tab }).click();
        const { violations: found } = await new AxeBuilder({ page }).analyze();
        expect(
          found
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map((v) => `${v.id} ${v.nodes[0]?.target}`),
          `${scheme} ${tab}`,
        ).toEqual([]);
      }
      await page.keyboard.press("Escape");
    }
    expect(violations).toEqual([]);
  });
});

test.describe("tablet width on a desktop browser", () => {
  test.skip(({ isMobile }) => isMobile, "phones are covered above");
  test.use({ viewport: { width: 800, height: 900 } });

  test("the same sheet works at 800px, centred, and Read opens the passage", async ({ page }) => {
    await page.goto(start);
    await trigger(page).click();
    const sheet = page.getByRole("dialog", { name: "Choose passage" });
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box!.width).toBeLessThan(800);
    await sheet.getByRole("button", { name: "Romans", exact: true }).click();
    await sheet.getByRole("button", { name: "Chapter 14" }).click();
    await sheet.getByRole("button", { name: "Whole chapter" }).click();
    await sheet.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/bsb/romans/14");
  });
});
