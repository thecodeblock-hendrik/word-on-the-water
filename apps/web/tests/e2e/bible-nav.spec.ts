import { expect, test } from "@playwright/test";

const reader = "/bible/bsb/john/3";

test.describe("desktop header", () => {
  test.skip(({ isMobile }) => isMobile, "the bar is only shown from 1024px");

  for (const width of [1024, 1100, 1280]) {
    test(`six links, the button and the theme toggle fit on one row at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(reader);
      const nav = page.getByRole("navigation", { name: "Main" });
      const links = nav.getByRole("link");
      await expect(links).toHaveCount(6);

      const boxes = await links.evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), left: r.left, right: r.right, height: r.height };
        }),
      );
      expect(new Set(boxes.map((b) => b.top)).size, "all links on one row").toBe(1);
      expect(boxes.every((b) => b.height >= 44)).toBe(true);

      const cta = await page.getByRole("link", { name: "Get the devotional" }).boundingBox();
      const toggle = await page
        .getByRole("banner")
        .getByRole("button", { name: /switch between light and dark/i })
        .boundingBox();
      const lastLink = boxes.at(-1)!;
      expect(cta!.x).toBeGreaterThanOrEqual(lastLink.right);
      expect(toggle!.x).toBeGreaterThanOrEqual(cta!.x + cta!.width);
      expect(toggle!.x + toggle!.width).toBeLessThanOrEqual(width);

      const header = await page.getByRole("banner").boundingBox();
      expect(header!.height).toBeLessThan(90);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("marks Bible as the current page with an underline, not only a colour", async ({ page }) => {
    await page.goto(reader);
    const bible = page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Bible" });
    await expect(bible).toHaveAttribute("aria-current", "page");
    expect(await bible.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
      "underline",
    );
    const other = page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "About" });
    await expect(other).not.toHaveAttribute("aria-current");
    expect(await other.evaluate((el) => getComputedStyle(el).textDecorationLine)).not.toContain(
      "underline",
    );
  });

  test("Bible in the bar opens the reader", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Bible" })
      .click();
    await expect(page).toHaveURL("/bible/bsb/john/3?v=16");
  });
});

test.describe("mobile menu", () => {
  test.skip(({ isMobile }) => !isMobile, "the menu replaces the bar below 1024px");

  test("lists Bible after Devotionals, marks it current on the reader and opens it", async ({
    page,
  }) => {
    await page.goto(reader);
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByTestId("mobile-menu");
    const links = menu.getByRole("link");
    await expect(links).toHaveText([
      "About",
      "Devotionals",
      "Bible",
      "Start here",
      "What we believe",
      "Prayer",
    ]);
    const bible = menu.getByRole("link", { name: "Bible" });
    await expect(bible).toHaveAttribute("aria-current", "page");
    expect((await bible.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const fromHome = page.getByTestId("mobile-menu").getByRole("link", { name: "Bible" });
    await expect(fromHome).not.toHaveAttribute("aria-current");
    await fromHome.click();
    // The reader was open on John 3 a moment ago, so /bible resumes there.
    await expect(page).toHaveURL("/bible/bsb/john/3");
  });
});

test("the footer lists Bible under Read", async ({ page }) => {
  await page.goto("/");
  const read = page.getByRole("contentinfo").getByRole("navigation", { name: "Read" });
  await expect(read.getByRole("link", { name: "Bible" })).toHaveAttribute("href", "/bible");
});
