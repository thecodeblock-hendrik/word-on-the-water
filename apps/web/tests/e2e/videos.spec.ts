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

const accept = (page: Page) =>
  page.context().addCookies([{ name: "youtube-consent", value: "yes", url: ON }]);
const banner = (page: Page) => page.getByRole("region", { name: "Cookies for videos" });
const settings = (page: Page) => page.getByRole("button", { name: "Cookie settings" });

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

test("a week's cover fills the whole of its player box", async ({ page }) => {
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto(`${ON}/videos/advent`);
    const gap = await page.locator("details[open] .video-cover").evaluate((cover) => {
      const box = cover.parentElement!.getBoundingClientRect();
      return Math.round(box.height - cover.getBoundingClientRect().height);
    });
    expect(gap, `${width}px`).toBe(0);
  }
});

test("Play puts the player in, and closing or changing rows takes it out", async ({ page }) => {
  await stubPlayer(page);
  const violations: string[] = [];
  page.on("console", (m) => {
    if (m.text().includes("Content Security Policy")) violations.push(m.text());
  });
  await accept(page);
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

test("Decline is remembered for six months, and Play then asks before loading YouTube", async ({
  page,
}) => {
  const outside: string[] = [];
  page.on("request", (request) => {
    if (/youtube|google|ytimg/.test(new URL(request.url()).host)) outside.push(request.url());
  });
  await stubPlayer(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${ON}/videos`);
  await banner(page).getByRole("button", { name: "Decline" }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  const cookie = (await page.context().cookies(ON)).find((c) => c.name === "youtube-consent")!;
  expect([cookie.value, cookie.sameSite, cookie.path]).toEqual(["no", "Lax", "/"]);
  const days = (cookie.expires - Date.now() / 1000) / 86_400;
  expect(days).toBeGreaterThan(181);
  expect(days).toBeLessThanOrEqual(182);

  await page.goto(`${ON}/videos/advent`);
  await expect(banner(page)).toHaveCount(0);
  await play(page, "Hope").click();
  const panel = page.getByRole("group", { name: "YouTube is turned off" });
  await expect(panel).toBeVisible();
  const inside = await panel.evaluate((el) => el.scrollHeight - el.parentElement!.clientHeight);
  expect(inside, "nothing in the panel is cut off").toBeLessThanOrEqual(0);
  for (const name of ["Allow and play", "Not now"]) {
    const box = (await panel.getByRole("button", { name }).boundingBox())!;
    expect(box.height, name).toBeGreaterThanOrEqual(44);
  }
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(outside).toEqual([]);

  await panel.getByRole("button", { name: "Allow and play" }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect.poll(async () => (await page.context().cookies(ON))[0].value).toBe("yes");
  await expect(page.locator("iframe")).toHaveCount(1);
});

test("the panel's buttons are not left under the bottom bar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto(`${ON}/videos/advent?week=love`);
  const button = play(page, "Love");
  const bar = page.locator("[data-bottom-nav]");
  await page.waitForTimeout(1500); // let the smooth scroll to ?week= finish before measuring
  // Put Play low on the screen, just clear of the bar, as a thumb would find it.
  const gap = (await button.boundingBox())!.y + 68 - ((await bar.boundingBox())!.y - 4);
  await page.evaluate((by) => window.scrollBy({ top: by, behavior: "instant" }), gap);
  await page.waitForTimeout(800); // the bar hides while the page scrolls, then returns
  await button.click();
  await page.waitForTimeout(800); // look once any scroll has ended and the bar is back
  for (const name of ["Allow and play", "Not now"]) {
    const control = page.getByRole("button", { name });
    const onTop = () =>
      control.evaluate((el) => {
        const { left, top, width, height } = el.getBoundingClientRect();
        // The top, middle and bottom of the button are all the button, not something over it.
        return [4, height / 2, height - 4].every((y) =>
          el.contains(document.elementFromPoint(left + width / 2, top + y)),
        );
      });
    await expect.poll(onTop, { message: name }).toBe(true);
  }
});

test("Cookie settings brings the banner back, and Decline stops a playing video", async ({
  page,
}) => {
  await stubPlayer(page);
  await page.goto(`${ON}/videos/advent`);
  await banner(page).getByRole("button", { name: "Accept" }).click();
  await expect(banner(page)).toHaveCount(0);
  await play(page, "Hope").click();
  await expect(page.locator("iframe")).toHaveCount(1);

  await settings(page).click();
  await expect(banner(page)).toContainText("You accepted YouTube.");
  await expect(banner(page)).toBeInViewport();
  await expect(banner(page)).toBeFocused();
  await expect(page.locator("iframe")).toHaveCount(1);

  await banner(page).getByRole("button", { name: "Decline" }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  await play(page, "Hope").click();
  await expect(page.getByRole("group", { name: "YouTube is turned off" })).toBeVisible();

  // Choosing the same again must close the reopened banner too.
  await settings(page).click();
  await banner(page).getByRole("button", { name: "Decline" }).click();
  await expect(banner(page)).toHaveCount(0);
});

test("the banner and its settings are only on the video pages", async ({ page }) => {
  for (const path of ["/", "/privacy"]) {
    await page.goto(`${ON}${path}`);
    await expect(banner(page), path).toHaveCount(0);
    await expect(settings(page), path).toHaveCount(0);
  }
  await page.goto(`${ON}/videos`);
  await expect(banner(page)).toBeVisible();
  await expect(settings(page)).toBeVisible();
});

test("the banner saves a choice without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${ON}/videos/advent`);
  await banner(page).getByRole("button", { name: "Decline" }).click();
  await expect(banner(page)).toHaveCount(0);
  await page.reload();
  await expect(banner(page)).toHaveCount(0);
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

test("the banner shows the dawn art in light and the night art in dark", async ({ page }) => {
  for (const [scheme, wanted, other] of [
    ["light", "art-dawn-patrol", "art-night-swell"],
    ["dark", "art-night-swell", "art-dawn-patrol"],
  ] as const) {
    for (const path of ["/videos", "/videos/advent"]) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${ON}${path}`);
      const shown = page.locator(`main img[src*="${wanted}"]`);
      await expect(shown, `${scheme} ${path}`).toBeVisible();
      await expect
        .poll(() => shown.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
      await expect(page.locator(`main img[src*="${other}"]`)).toBeHidden();
    }
  }
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
