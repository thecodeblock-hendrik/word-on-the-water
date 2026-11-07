import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const start = "/bible/bsb/john/3";
const trigger = (page: Page, name: RegExp = /Change passage/) => page.getByRole("button", { name });

async function pickLabelled(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

test.describe("passage sheet (below 1024px)", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) >= 1024,
    "the desktop column replaces the sheet",
  );

  test("opens on the Book step with four steps", async ({ page }) => {
    await page.goto(start);
    await trigger(page).click();
    const sheet = page.getByRole("dialog", { name: "Choose passage" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { level: 2, name: "Choose a book" })).toBeVisible();
    await expect(sheet.getByRole("navigation", { name: "Steps" }).getByRole("button")).toHaveCount(
      4,
    );
  });

  test("choose WEB, John, chapter 3, verses 16 to 18, then Read", async ({ page }) => {
    await page.goto("/bible/bsb/genesis/1");
    await trigger(page).click();
    const sheet = page.getByRole("dialog", { name: "Choose passage" });

    await sheet.getByRole("button", { name: /^1 Bible/ }).click();
    await sheet.getByRole("radio", { name: /World English Bible/ }).click();
    await expect(sheet.getByRole("heading", { name: "Choose a book" })).toBeVisible();

    await sheet.getByRole("button", { name: "John", exact: true }).click();
    await expect(sheet.getByRole("heading", { name: "Choose a chapter in John" })).toBeVisible();
    await sheet.getByRole("button", { name: "3", exact: true }).click();

    await expect(sheet.getByRole("heading", { name: "Choose verses" })).toBeVisible();
    await sheet.getByRole("radio", { name: /Some verses/ }).click();
    const first = sheet.getByRole("group", { name: "First verse" });
    const last = sheet.getByRole("group", { name: "Last verse" });
    for (let i = 0; i < 15; i++)
      await first.getByRole("button", { name: "Increase first verse" }).click();
    for (let i = 0; i < 2; i++)
      await last.getByRole("button", { name: "Increase last verse" }).click();
    await expect(first.getByRole("status")).toHaveText("16");
    await expect(last.getByRole("status")).toHaveText("18");

    await sheet.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/web/john/3?v=16-18");
    await expect(page.getByRole("heading", { level: 1, name: "John 3:16–18" })).toBeVisible();
    await expect(page.getByText("his only born Son")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger(page, /Change passage: John 3:16–18/)).toBeVisible();
  });

  test("a whole chapter in another book: Psalms, chapter 119", async ({ page }) => {
    await page.goto(start);
    await trigger(page).click();
    await pickLabelled(page, "Psalms");
    await page.getByRole("button", { name: "119", exact: true }).click();
    await page.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/bsb/psalms/119");
    await expect(page.getByRole("heading", { level: 1, name: "Psalms 119" })).toBeVisible();
  });

  test("Escape closes the sheet, changes nothing and returns focus to the trigger", async ({
    page,
  }) => {
    await page.goto(start);
    await trigger(page).click();
    await pickLabelled(page, "Romans");
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

  test("every control in every step is at least 44px", async ({ page }) => {
    await page.goto(start);
    await trigger(page).click();
    const sheet = page.getByRole("dialog");
    const tooSmall = async () => {
      const sizes = await sheet.locator("button:visible, label:visible").evaluateAll((els) =>
        els.map((el) => ({
          name: el.textContent?.trim().slice(0, 20),
          h: el.getBoundingClientRect().height,
        })),
      );
      expect(sizes.length, "checked some controls").toBeGreaterThan(3);
      return sizes.filter(({ h }) => h < 43.5).map(({ name }) => name);
    };
    expect(await tooSmall(), "book step").toEqual([]);
    await sheet.getByRole("button", { name: /^3 Chapter/ }).click();
    expect(await tooSmall(), "chapter step").toEqual([]);
    await sheet.getByRole("button", { name: /^4 Verses/ }).click();
    await sheet.getByRole("radio", { name: /Some verses/ }).click();
    expect(await tooSmall(), "verses step").toEqual([]);
    await sheet.getByRole("button", { name: /^1 Bible/ }).click();
    expect(await tooSmall(), "bible step").toEqual([]);
  });

  test("no sideways scrolling in any step, even the 150-chapter Psalms grid", async ({ page }) => {
    await page.goto(start);
    await trigger(page).click();
    const sheet = page.getByRole("dialog");
    const overflow = () =>
      sheet.evaluate((el) => {
        const panel = el.querySelector(".overflow-y-auto") ?? el;
        return Math.max(el.scrollWidth - el.clientWidth, panel.scrollWidth - panel.clientWidth);
      });
    expect(await overflow()).toBeLessThanOrEqual(0);
    await sheet.getByRole("button", { name: "Psalms", exact: true }).click();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });

  test("no CSP violation and no serious axe problem on any step, in light and dark", async ({
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
      for (const step of [/^1 Bible/, /^2 Book/, /^3 Chapter/, /^4 Verses/]) {
        await sheet.getByRole("button", { name: step }).click();
        const { violations: found } = await new AxeBuilder({ page }).analyze();
        expect(
          found
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map((v) => `${v.id} ${v.nodes[0]?.target}`),
          `${scheme} ${step}`,
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
    await pickLabelled(page, "Romans");
    await page.getByRole("button", { name: "14", exact: true }).click();
    await page.getByRole("button", { name: "Read" }).click();
    await expect(page).toHaveURL("/bible/bsb/romans/14");
  });
});
