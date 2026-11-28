import AxeBuilder from "@axe-core/playwright";
import { type Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// The second test server has the videos on; the main one has them off. Its day is 2026-12-05,
// in Hope's week.
const ON = "http://localhost:3102";

const openThemes = (page: Page) =>
  page.locator("details[open] summary [data-theme-name]").allTextContents();
const summary = (page: Page, theme: string) => page.locator("summary", { hasText: theme });
const play = (page: Page, theme: string) => page.getByRole("button", { name: `Play ${theme}` });
const PLAYER = "https://www.youtube-nocookie.com/";

/** Stands in for YouTube, so the tests do not depend on it. The page's CSP still applies. */
async function stubPlayer(page: Page) {
  await page.route(`${PLAYER}**`, (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>stand-in player</p>" }),
  );
}

test("the policy allows the player only where videos are on", async ({ page }) => {
  const frames = async (url: string) =>
    (await page.goto(url))!.headers()["content-security-policy"].match(/frame-src[^;]*/)![0];
  expect(await frames("/")).not.toContain("youtube");
  expect(await frames(`${ON}/`)).toContain("https://www.youtube-nocookie.com");
});

test("Play puts the player in, and closing or changing rows takes it out", async ({ page }) => {
  await stubPlayer(page);
  const violations: string[] = [];
  page.on("console", (m) => {
    if (m.text().includes("Content Security Policy")) violations.push(m.text());
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${ON}/videos/advent`);
  const frames = page.locator("iframe");
  await expect(frames).toHaveCount(0);

  const button = play(page, "Hope");
  const size = (await button.boundingBox())!;
  expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(44);
  const loaded = page.waitForResponse((r) => r.url().startsWith(PLAYER));
  await button.click();
  expect((await loaded).url()).toBe(`${PLAYER}embed/4WYNBjJSYvE?autoplay=1&playsinline=1&rel=0`);
  await expect(frames).toHaveAttribute("title", "Hope, a video by BibleProject");
  await expect(page.frameLocator("iframe").locator("body")).toHaveText("stand-in player");
  expect((await frames.boundingBox())!.height).toBeGreaterThanOrEqual(200);

  await summary(page, "Hope").click();
  await expect(frames).toHaveCount(0);

  await summary(page, "Hope").click();
  await play(page, "Hope").click();
  await expect(frames).toHaveCount(1);
  await summary(page, "Love").click();
  await expect(frames).toHaveCount(0);
  await play(page, "Love").click();
  await expect(frames).toHaveCount(1);
  await expect(frames).toHaveAttribute("title", "Love, a video by BibleProject");
  expect(violations).toEqual([]);
});

test("a ?week= address scrolls to its row, below the header", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 600 });
  await page.goto(`${ON}/videos/advent?week=love`);
  expect(await openThemes(page)).toEqual(["Love"]);
  const top = () => page.locator("#love").evaluate((row) => row.getBoundingClientRect().top);
  await expect.poll(top).toBeLessThan(120);
  expect(await top()).toBeGreaterThanOrEqual(60);
});

test("an opened row stays in view when the one above it closes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 500 });
  await page.goto(`${ON}/videos/advent`);
  // Bring Peace's heading near the top, with Hope open above it.
  await page.locator("#peace").evaluate((row) => {
    window.scrollTo({
      top: row.getBoundingClientRect().top + window.scrollY - 90,
      behavior: "instant",
    });
  });
  await summary(page, "Peace").click();
  await expect.poll(() => openThemes(page)).toEqual(["Peace"]);
  await expect(summary(page, "Peace")).toBeInViewport({ ratio: 1 });
});

test("the video pages are not found while videos are off", async ({ page }) => {
  for (const path of ["/videos", "/videos/advent"]) {
    expect((await page.goto(path))!.status(), path).toBe(404);
  }
});

test("the menu or header, and the What's coming card, lead to the videos", async ({ page }) => {
  await page.goto(`${ON}/`);
  const card = page.getByRole("link", { name: "Watch the Advent series" });
  await expect(card).toHaveAttribute("href", "/videos");
  const wide = page.viewportSize()!.width >= 1024;
  if (!wide) await page.getByRole("button", { name: "Menu" }).click();
  const nav = page.getByRole("navigation", { name: wide ? "Main" : "Main menu", exact: true });
  await nav.getByRole("link", { name: "Videos" }).click();
  await expect(page).toHaveURL(`${ON}/videos`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Videos");
});

test("with videos off there is no way in", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href^="/videos"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Audio and video" })).toBeAttached();
  expect(await (await page.request.get("/sitemap.xml")).text()).not.toContain("/videos");
});

test("the desktop header stays one row at 1024px with every link", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones use the menu");
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto(`${ON}/`);
  await page.evaluate(() => document.fonts.ready);
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Videos" })).toBeVisible();
  const { overflow, centres, heights } = await header.evaluate((banner) => {
    const row = [...banner.firstElementChild!.querySelectorAll("a, button")]
      .map((el) => el.getBoundingClientRect())
      .filter((box) => box.width > 0);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      centres: row.map((box) => box.top + box.height / 2),
      heights: row.map((box) => box.height),
    };
  });
  expect(overflow).toBeLessThanOrEqual(0);
  expect(Math.max(...centres) - Math.min(...centres)).toBeLessThanOrEqual(2);
  // A label that wrapped onto two lines would make its link taller than the 44px target.
  expect(Math.max(...heights)).toBeLessThanOrEqual(46);
});

test("the privacy page links Google's and YouTube's terms and fits a 320px phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${ON}/privacy`);
  await expect(page.getByText("Watching videos", { exact: true })).toBeVisible();
  for (const url of [
    "https://www.youtube.com/t/terms",
    "https://www.google.com/policies/privacy",
  ]) {
    await expect(page.getByRole("link", { name: url })).toHaveAttribute("href", url);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("the shelf leads to the weekly path, with this week open", async ({ page }) => {
  await page.goto(`${ON}/videos`);
  await page.getByRole("link", { name: /Advent word studies/ }).click();
  await expect(page).toHaveURL(`${ON}/videos/advent`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Advent word studies");
  expect(await openThemes(page)).toEqual(["Hope"]);
});

test("rows open and close one at a time without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${ON}/videos/advent`);
  await summary(page, "Joy").click();
  await expect.poll(() => openThemes(page)).toEqual(["Joy"]);
  await expect(page.locator("details[open]").getByText("Watch on BibleProject")).toBeVisible();
  await summary(page, "Joy").click();
  await expect.poll(() => openThemes(page)).toEqual([]);
  await expect(page.getByRole("button", { name: /^Play / })).toHaveCount(0);
});

test("opening and reading the pages asks nothing of any other site", async ({ page }) => {
  const outside: string[] = [];
  page.on("request", (request) => {
    const { protocol, host } = new URL(request.url());
    if (protocol.startsWith("http") && !host.startsWith("localhost")) outside.push(request.url());
  });
  await page.goto(`${ON}/videos`, { waitUntil: "networkidle" });
  await page.goto(`${ON}/videos/advent`, { waitUntil: "networkidle" });
  await summary(page, "Peace").click();
  await page.waitForLoadState("networkidle");
  expect(outside).toEqual([]);
});

for (const path of ["/videos", "/videos/advent"]) {
  test(`${path} has no serious or critical axe problem, in light and dark`, async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${ON}${path}`);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(
        violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id} ${v.nodes[0]?.target}`),
        scheme,
      ).toEqual([]);
    }
  });

  test(`${path} fits a 320px phone and is one centred column when wider`, async ({ page }) => {
    for (const width of [320, 744, 1024, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${ON}${path}`);
      const { overflow, left, right } = await page.evaluate(() => {
        const heading = document.querySelector("main > div")!;
        const boxes = [...heading.children].map((child) => child.getBoundingClientRect());
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          left: Math.min(...boxes.map((b) => b.left)),
          right: Math.max(...boxes.map((b) => b.right)),
        };
      });
      const room = await page.evaluate(() => document.documentElement.clientWidth);
      expect(overflow, `${width}px overflow`).toBeLessThanOrEqual(0);
      expect(right - left, `${width}px column`).toBeLessThanOrEqual(640);
      expect(Math.abs(left - (room - right)), `${width}px centred`).toBeLessThanOrEqual(1);
    }
  });
}
