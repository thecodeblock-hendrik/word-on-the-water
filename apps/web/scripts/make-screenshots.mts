import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "@playwright/test";

/**
 * Takes the manifest screenshots of a running production build in Dawn patrol (light).
 * Start the site with DEVOTIONAL_TODAY=2026-11-28 BIBLE_ENABLED=1 so the first devotional and the
 * reader exist, then run `pnpm make:screenshots` (BASE_URL defaults to http://localhost:3100).
 */
const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = join(import.meta.dirname, "../public/screenshots");

const pages = [
  { file: "landing.png", path: "/" },
  { file: "devotional.png", path: "/devotionals/advent-01-more-than-watchmen" },
  { file: "bible.png", path: "/bible/bsb/john/3?v=16-18" },
];

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
await context.addCookies([{ name: "theme", value: "light", url: base }]);

for (const { file, path } of pages) {
  const page = await context.newPage();
  const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, file) });
  console.log(`${file} from ${path}`);
  await page.close();
}
await browser.close();
