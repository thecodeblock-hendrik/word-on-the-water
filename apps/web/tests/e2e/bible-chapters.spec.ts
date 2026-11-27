import { expect, test } from "@playwright/test";

const john3 = "/bible/bsb/john/3";

test("the chapter before and after are links in the same Bible, to the whole chapter", async ({
  page,
}) => {
  await page.goto("/bible/web/john/3?v=16-18");
  const nav = page.getByRole("navigation", { name: "Previous and next chapter" });
  await expect(nav.getByRole("link", { name: "Previous chapter: John 2" })).toHaveAttribute(
    "href",
    "/bible/web/john/2",
  );
  await nav.getByRole("link", { name: "Next chapter: John 4" }).click();
  await expect(page).toHaveURL("/bible/web/john/4");
  await expect(page.getByRole("heading", { level: 1, name: "John 4" })).toBeVisible();
});

test("a chapter step crosses into the neighbouring book and back, including the Testaments", async ({
  page,
}) => {
  await page.goto("/bible/bsb/malachi/4");
  // On a phone the names are the short forms ("Matt 1", "Mal 4"), because the middle button needs room.
  await page.getByRole("link", { name: /^Next chapter: (Matthew|Matt) 1$/ }).click();
  await expect(page).toHaveURL("/bible/bsb/matthew/1");
  await page.getByRole("link", { name: /^Previous chapter: (Malachi|Mal) 4$/ }).click();
  await expect(page).toHaveURL("/bible/bsb/malachi/4");
});

test("the first and last chapters of the Bible have a disabled button, not a dead link", async ({
  page,
}) => {
  await page.goto("/bible/bsb/genesis/1");
  let nav = page.getByRole("navigation", { name: "Previous and next chapter" });
  await expect(nav.getByRole("button", { name: /Start of the Bible/ })).toBeDisabled();
  await expect(nav.getByRole("link", { name: /^Previous chapter/ })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: /^Next chapter: (Genesis|Gen) 2$/ })).toBeVisible();

  await page.goto("/bible/bsb/revelation/22");
  nav = page.getByRole("navigation", { name: "Previous and next chapter" });
  await expect(nav.getByRole("button", { name: /End of the Bible/ })).toBeDisabled();
  await expect(nav.getByRole("link", { name: /^Next chapter/ })).toHaveCount(0);
});

test("the head names the chapters before and after, for search engines and reading tools", async ({
  page,
}) => {
  await page.goto(john3);
  const path = async (rel: string) =>
    new URL((await page.locator(`link[rel='${rel}']`).getAttribute("href"))!, page.url()).pathname;
  expect(await path("prev")).toBe("/bible/bsb/john/2");
  expect(await path("next")).toBe("/bible/bsb/john/4");
  await page.goto("/bible/bsb/genesis/1");
  await expect(page.locator("link[rel='prev']")).toHaveCount(0);
  await expect(page.locator("link[rel='next']")).toHaveCount(1);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the next chapter button is an ordinary link and works", async ({ page }) => {
    await page.goto(john3);
    await page.getByRole("link", { name: "Next chapter: John 4" }).click();
    await expect(page).toHaveURL("/bible/bsb/john/4");
    await expect(page.getByRole("heading", { level: 1, name: "John 4" })).toBeVisible();
  });
});

test.describe("the reader has no site footer", () => {
  for (const path of [john3, `${john3}?v=16`, "/bible/web/psalms/119"]) {
    test(`none on ${path}, and the page still has its header`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(page.getByRole("contentinfo")).toHaveCount(0);
    });
  }

  test("the footer is still on the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
});

test.describe("on a phone or tablet (below 1024px)", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) >= 1024,
    "from 1024px the buttons sit under the text",
  );

  // The glass capsule floats this far above the bottom edge where there is no home indicator.
  const FLOAT = 14;

  test("the bar floats at the bottom of the screen with two tall buttons in thumb reach", async ({
    page,
  }) => {
    await page.goto(john3);
    const bar = page.getByRole("navigation", { name: "Previous and next chapter" });
    const box = (await bar.boundingBox())!;
    const height = page.viewportSize()!.height;
    expect(box.y + box.height).toBeCloseTo(height - FLOAT, 0);
    const links = await bar.getByRole("link", { name: /chapter/ }).all();
    expect(links).toHaveLength(2);
    for (const link of links) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const [a, b] = [await links[0].boundingBox(), await links[1].boundingBox()];
    expect(a!.x + a!.width).toBeLessThanOrEqual(b!.x);
  });

  test("tapping the next button opens the next chapter", async ({ page }) => {
    await page.goto(`${john3}?v=16-18`);
    await page.getByRole("link", { name: "Next chapter: John 4" }).tap();
    await expect(page).toHaveURL("/bible/bsb/john/4");
    await expect(page.getByRole("heading", { level: 1, name: "John 4" })).toBeVisible();
  });

  const barOf = (page: import("@playwright/test").Page) =>
    page.getByRole("navigation", { name: "Previous and next chapter" });

  test("scrolling to the end of a chapter leaves the bar at the bottom of the screen, with the credit above it", async ({
    page,
  }) => {
    await page.goto("/bible/bsb/psalms/119");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const height = page.viewportSize()!.height;
    const bar = (await barOf(page).boundingBox())!;
    expect(bar.y + bar.height).toBeCloseTo(height - FLOAT, 0);
    // Nothing is hidden behind the bar: the last line of the page (the credit) ends above it.
    const credit = (await page.getByText("Berean Standard Bible (BSB), dedicated").boundingBox())!;
    expect(credit.y + credit.height).toBeLessThanOrEqual(bar.y + 1);
  });

  test("a short passage has the bar at the bottom of the screen, before and after scrolling", async ({
    page,
  }) => {
    await page.goto(`${john3}?v=16`);
    const height = page.viewportSize()!.height;
    for (const scroll of [false, true]) {
      if (scroll)
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(200);
      const bar = (await barOf(page).boundingBox())!;
      expect(bar.y + bar.height).toBeCloseTo(height - FLOAT, 0);
    }
  });

  test("the bar never covers the passage button or the version chip at the top", async ({
    page,
  }) => {
    await page.goto(john3);
    const bar = (await page
      .getByRole("navigation", { name: "Previous and next chapter" })
      .boundingBox())!;
    const passage = (await page.getByRole("button", { name: /Change passage/ }).boundingBox())!;
    expect(passage.y + passage.height).toBeLessThan(bar.y);
  });
});

test.describe("on a desktop (1024px and wider)", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "below 1024px the bar is pinned");

  test("the buttons sit under the text, not pinned", async ({ page }) => {
    await page.goto(john3);
    const bar = page.getByRole("navigation", { name: "Previous and next chapter" });
    expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe("static");
    const text = (await page.getByRole("article").boundingBox())!;
    expect((await bar.boundingBox())!.y).toBeGreaterThanOrEqual(text.y + text.height - 1);
  });

  test("the right arrow opens the next chapter and the left arrow the previous", async ({
    page,
  }) => {
    await page.goto(john3);
    await expect(page.getByRole("heading", { level: 1, name: "John 3" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL("/bible/bsb/john/4");
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(john3);
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL("/bible/bsb/john/2");
  });

  test("the arrows do nothing at the first chapter's start", async ({ page }) => {
    await page.goto("/bible/bsb/genesis/1");
    await expect(page.getByRole("heading", { level: 1, name: "Genesis 1" })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(300);
    await expect(page).toHaveURL("/bible/bsb/genesis/1");
  });

  test("a focused radio keeps its arrow key: the picker\'s Bible switch moves its choice, not the chapter", async ({
    page,
  }) => {
    await page.goto(john3);
    await page.getByRole("button", { name: /Change passage/ }).click();
    await page
      .getByRole("dialog", { name: "Choose passage" })
      .getByRole("radio", { name: "BSB" })
      .focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "WEB" })).toBeChecked();
    await expect(page).toHaveURL(john3);
  });
});

test.describe("tablet width on a desktop browser", () => {
  test.skip(({ isMobile }) => isMobile, "phones are covered above");
  test.use({ viewport: { width: 800, height: 900 } });

  test("arrow keys are left alone while the passage sheet is open", async ({ page }) => {
    await page.goto(john3);
    await page.getByRole("button", { name: /Change passage/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(john3);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("the pinned bar and the arrow keys both work at 800px", async ({ page }) => {
    await page.goto(john3);
    await page.getByRole("link", { name: "Next chapter: John 4" }).click();
    await expect(page).toHaveURL("/bible/bsb/john/4");
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(john3);
  });
});

// The widest labels in the Bible, in the neighbours a reader sees: Song of Solomon 8, 2 Thessalonians
// 3, 1 Thessalonians 5, Deuteronomy 34 and 1 Corinthians 14. Plain (non-mobile) windows, so the widths are exact.
const LONG_NAMES = [
  "/bible/bsb/song-of-solomon/7",
  "/bible/bsb/2-thessalonians/2",
  "/bible/bsb/1-corinthians/15",
  "/bible/bsb/1-thessalonians/4",
  "/bible/bsb/deuteronomy/33",
];

for (const width of [320, 360, 375, 390, 412]) {
  test(`the chapter buttons keep book and number on one line at ${width}px`, async ({
    browser,
  }) => {
    const page = await (await browser.newContext({ viewport: { width, height: 800 } })).newPage();
    for (const path of LONG_NAMES) {
      await page.goto(path);
      const links = page
        .getByRole("navigation", { name: "Previous and next chapter" })
        .getByRole("link", { name: /chapter/ });
      for (const link of await links.all()) {
        const label = `${path}: ${await link.innerText()}`;
        expect((await link.boundingBox())!.height, label).toBeLessThanOrEqual(54);
        expect((await link.locator(".truncate").boundingBox())!.height, label).toBeLessThanOrEqual(
          20,
        );
        expect(await link.evaluate((el) => el.scrollWidth <= el.clientWidth), label).toBe(true);
        await expect(link.locator("svg"), label).toBeVisible();
        // On a phone the short form shows (the middle button needs room), and it all fits.
        expect(await link.locator(".truncate").innerText(), label).toMatch(/[A-Za-z]{3,}/);
        expect(
          await link.locator(".truncate").evaluate((el) => el.scrollWidth <= el.clientWidth),
          `${label}: the name is cut off`,
        ).toBe(true);
      }
    }
  });
}
