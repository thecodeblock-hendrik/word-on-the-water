import AxeBuilder from "@axe-core/playwright";
import { type Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// The second test server has the videos on; the main one has them off. Its day is 2026-12-05,
// in Hope's week.
const ON = "http://localhost:3102";

const openThemes = (page: Page) =>
  page.locator("details[open] summary [data-theme-name]").allTextContents();
const summary = (page: Page, theme: string) => page.locator("summary", { hasText: theme });

test("the video pages are not found while videos are off", async ({ page }) => {
  for (const path of ["/videos", "/videos/advent"]) {
    expect((await page.goto(path))!.status(), path).toBe(404);
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
