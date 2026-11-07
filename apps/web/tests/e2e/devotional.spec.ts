import { expect, type Page, test } from "@playwright/test";

const path = "/devotionals/advent-01-more-than-watchmen";
const week2 = "/devotionals/advent-02-the-long-wait";
// The test server pretends it is Saturday 12 December 2026 (see playwright.config.ts),
// so weeks 1 and 2 are published and the card shows the newest, week 2.

test("the landing card shows the newest published devotional and opens it in full", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: /devotional preview/i });
  await expect(card.getByRole("heading", { level: 3, name: "The Long Wait" })).toBeVisible();
  await page.getByRole("link", { name: "Read the full devotional" }).click();
  await expect(page).toHaveURL(week2);
  await expect(page.getByRole("heading", { level: 1, name: "The Long Wait" })).toBeVisible();
});

test("from week 2 the series list goes back to week 1, which opens in full, and forward again", async ({
  page,
}) => {
  await page.goto(week2);
  const weeks = page.getByRole("navigation", { name: "Advent weeks" });
  await weeks.getByRole("link", { name: "More Than Watchmen" }).click();
  await expect(page).toHaveURL(path);
  await expect(page.getByRole("heading", { level: 1, name: "More Than Watchmen" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Advent weeks" })
    .getByRole("link", { name: "The Long Wait" })
    .click();
  await expect(page).toHaveURL(week2);
});

test("the Previous card on week 2 opens week 1, and week 3 is shown but not a link", async ({
  page,
}) => {
  await page.goto(week2);
  const nav = page.getByRole("navigation", { name: "Series" });
  await expect(nav).toContainText("Next · 19 December");
  await expect(nav.getByRole("link", { name: /Next/ })).toHaveCount(0);
  const weeks = page.getByRole("navigation", { name: "Advent weeks" });
  await expect(weeks.getByRole("link")).toHaveCount(1);
  await nav.getByRole("link", { name: /Previous/ }).click();
  await expect(page).toHaveURL(path);
});

test("the page loads with no CSP violations, failed requests or console errors", async ({
  page,
}) => {
  const problems: string[] = [];
  // /_vercel/* is served by the Vercel platform only, so it is a 404 under a local server.
  const local = (url: string) => url.includes("/_vercel/");
  page.on("console", (m) => {
    const isProblem = m.type() === "error" || m.text().includes("Content Security Policy");
    if (isProblem && !local(m.location().url) && !local(m.text())) problems.push(m.text());
  });
  page.on("requestfailed", (r) => {
    if (!local(r.url()) && !r.url().includes("_rsc=")) problems.push(r.url());
  });

  await page.goto(path);
  await page.waitForLoadState("networkidle");
  expect(problems).toEqual([]);
});

test("every image that is shown has loaded, one per colour scheme", async ({ page }) => {
  await page.goto(path);
  await page.locator("[aria-labelledby=h-verse]").scrollIntoViewIfNeeded();
  // Not "networkidle": the sign-up widget just below starts talking to Cloudflare as it nears.
  await page.waitForFunction(() =>
    [...document.querySelectorAll("figure img, [aria-labelledby=h-verse] img")]
      .filter((img) => (img as HTMLElement).offsetParent !== null)
      .every((img) => (img as HTMLImageElement).complete),
  );
  const shown = await page.evaluate(() =>
    [...document.querySelectorAll("figure img, [aria-labelledby=h-verse] img")]
      .filter((img) => (img as HTMLElement).offsetParent !== null)
      .map((img) => (img as HTMLImageElement).naturalWidth),
  );
  expect(shown).toHaveLength(2);
  expect(shown.every((width) => width > 0)).toBe(true);
});

const shown = (page: Page, scheme: "when-light" | "when-dark") =>
  page.locator(`[aria-labelledby=h-verse] .${scheme} img`);

test("a visitor's dark theme choice shows the night swell images", async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "theme", value: "dark", url: baseURL! }]);
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(shown(page, "when-dark")).toBeVisible();
  await expect(shown(page, "when-light")).toBeHidden();
});

test("a dark device shows the night swell images", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(path);
  const applied = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);
  // CI's Firefox does not apply the emulated scheme (the page stays light), so there is
  // nothing to test there. The theme cookie test above covers dark in every browser.
  test.skip(!applied, "this browser did not apply the emulated dark scheme");
  await expect(shown(page, "when-dark")).toBeVisible();
  await expect(shown(page, "when-light")).toBeHidden();
});

test("a light device shows the dawn patrol images", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(path);
  await expect(shown(page, "when-light")).toBeVisible();
  await expect(shown(page, "when-dark")).toBeHidden();
});

test("the page does not scroll sideways because of its own content", async ({ page }) => {
  await page.goto(path);
  const wide = await page.evaluate(
    () =>
      [...document.querySelectorAll("main *")].filter(
        (el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1,
      ).length,
  );
  expect(wide).toBe(0);
});

test("an unknown devotional is a 404", async ({ request }) => {
  expect((await request.get("/devotionals/nope")).status()).toBe(404);
});

test("on a phone the surf report is above the article and the series list is below it", async ({
  browser,
}) => {
  const page = await (
    await browser.newContext({ viewport: { width: 375, height: 812 } })
  ).newPage();
  await page.goto(path);
  const top = async (locator: ReturnType<typeof page.locator>) => (await locator.boundingBox())!.y;
  const report = await top(page.getByRole("complementary", { name: /about this devotional/i }));
  const article = await top(page.locator("article"));
  const seriesNav = await top(page.getByRole("navigation", { name: "Series" }));
  const weeks = await top(page.getByRole("navigation", { name: "Advent weeks" }));
  expect(report).toBeLessThan(article);
  expect(weeks).toBeGreaterThan(seriesNav);
});

test("on a wide screen both panels sit in a column beside the article", async ({ browser }) => {
  const page = await (
    await browser.newContext({ viewport: { width: 1280, height: 900 } })
  ).newPage();
  await page.goto(path);
  const box = async (locator: ReturnType<typeof page.locator>) => (await locator.boundingBox())!;
  const article = await box(page.locator("article"));
  const report = await box(page.getByRole("complementary", { name: /about this devotional/i }));
  const weeks = await box(page.getByRole("navigation", { name: "Advent weeks" }));
  expect(report.x).toBeGreaterThan(article.x + article.width);
  expect(weeks.x).toBe(report.x);
  expect(weeks.y).toBeGreaterThan(report.y + report.height);
});
