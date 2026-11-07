import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const john3 = "/bible/bsb/john/3";

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test("a BSB chapter shows its title, verse 16, the BSB credit and the footer notice", async ({
  page,
}) => {
  await page.goto(john3);
  await expect(page.getByRole("heading", { level: 1, name: "John 3" })).toBeVisible();
  await expect(
    page.getByText("For God so loved the world that He gave His one and only Son"),
  ).toBeVisible();
  await expect(
    page.getByText("Berean Standard Bible (BSB), dedicated to the public domain."),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Crossway");
  await expect(page).toHaveTitle("John 3 (BSB) | Word on the Water");
});

test("a WEB chapter shows the WEB text and credit", async ({ page }) => {
  await page.goto("/bible/web/john/3");
  await expect(page.getByRole("heading", { level: 1, name: "John 3" })).toBeVisible();
  await expect(page.getByText("his only born Son")).toBeVisible();
  await expect(page.getByText("World English Bible (WEB), public domain.")).toBeVisible();
  await expect(page).toHaveTitle("John 3 (WEB) | Word on the Water");
});

test("verses 16 to 18 show only those verses, with the range in the heading and a link to the chapter", async ({
  page,
}) => {
  await page.goto(`${john3}?v=16-18`);
  await expect(page.getByRole("heading", { level: 1, name: "John 3:16–18" })).toBeVisible();
  await expect(page.getByText("Verses 16 to 18")).toBeVisible();
  await expect(page.getByText("For God so loved the world")).toBeVisible();
  await expect(page.getByText("Whoever believes in Him is not condemned")).toBeVisible();
  await expect(page.getByText("Nicodemus")).toHaveCount(0);
  await expect(page.getByText("The wind blows where it wishes")).toHaveCount(0);

  const link = page.getByRole("link", { name: "Show full chapter" });
  const box = await link.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await link.click();
  await expect(page).toHaveURL(john3);
  await expect(page.getByText("Nicodemus").first()).toBeVisible();
});

test("poetry keeps its lines: Psalm 23 reads in full", async ({ page }) => {
  await page.goto("/bible/bsb/psalms/23");
  await expect(page.getByRole("heading", { level: 1, name: "Psalms 23" })).toBeVisible();
  await expect(page.getByText(/The LORD is my shepherd;/)).toBeVisible();
  await expect(page.getByText("I will dwell in the house of the LORD")).toBeVisible();
});

test("verses this version does not have show the whole chapter with a note", async ({ page }) => {
  await page.goto("/bible/bsb/romans/14?v=24-26");
  await expect(page.getByRole("heading", { level: 1, name: "Romans 14" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText(
    "Verses 24–26 are not in the Berean Standard Bible, so the whole chapter is shown.",
  );
});

test("a verse range that cannot be read shows the whole chapter with a note", async ({ page }) => {
  for (const bad of ["20-10", "abc", "0", "1,2"]) {
    const response = await page.goto(`${john3}?v=${bad}`);
    expect(response?.status(), bad).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "John 3" })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("That verse range was not understood");
  }
  const twice = await page.goto(`${john3}?v=1&v=2`);
  expect(twice?.status()).toBe(200);
  await expect(page.getByRole("note")).toContainText("That verse range was not understood");
});

test("addresses that do not exist return 404, never an error", async ({ page }) => {
  for (const path of [
    "/bible/bsb/nobook/1",
    "/bible/bsb/john/99",
    "/bible/bsb/john/0",
    "/bible/bsb/john/03",
    "/bible/bsb/john/1.5",
    "/bible/bsb/john/abc",
    "/bible/esv/john/3",
    "/bible/kjv/john/3",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }
});

test("/bible opens the first chapter of John in the BSB", async ({ page }) => {
  await page.goto("/bible");
  await expect(page).toHaveURL("/bible/bsb/john/1");
  await expect(page.getByRole("heading", { level: 1, name: "John 1" })).toBeVisible();
});

test("the page sets a canonical address, and a verse range points at its chapter", async ({
  page,
}) => {
  await page.goto(`${john3}?v=16-18`);
  const href = await page.locator("link[rel='canonical']").getAttribute("href");
  expect(new URL(href!, page.url()).pathname).toBe(john3);
});

test("no CSP violations, no inline styles and every inline script has the nonce", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });
  await page.goto("/bible/bsb/psalms/119");
  await expect(page.getByRole("heading", { level: 1, name: "Psalms 119" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  expect(violations).toEqual([]);
  const withStyle = await page.evaluate(
    () => document.querySelector("main")?.querySelectorAll("[style]").length,
  );
  expect(withStyle).toBe(0);
  const inlineWithoutNonce = await page.evaluate(
    () => [...document.scripts].filter((script) => !script.src && !script.nonce).length,
  );
  expect(inlineWithoutNonce).toBe(0);
});

test("the longest chapter fits the screen without sideways scrolling", async ({ page }) => {
  await page.goto("/bible/bsb/psalms/119");
  await expect(page.getByRole("heading", { level: 1, name: "Psalms 119" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test.describe("accessibility", () => {
  test("the axe check catches a real problem (an image with no description)", async ({ page }) => {
    await page.setContent('<main><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main>');
    expect(await seriousViolations(page)).toContainEqual(expect.stringContaining("image-alt"));
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`no serious or critical axe violations in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of [
        john3,
        `${john3}?v=16-18`,
        "/bible/bsb/psalms/3",
        "/bible/web/song-of-solomon/1",
      ]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Page not found");
        await expect(page.getByRole("article")).toBeVisible();
        expect(await seriousViolations(page), path).toEqual([]);
      }
    });
  }
});

test.describe("remembering the Bible you read last", () => {
  test("/bible opens John 1 in the version you read last", async ({ page, context }) => {
    const remembered = async () =>
      (await context.cookies()).find((c) => c.name === "bible-version")?.value;
    await page.goto("/bible/web/romans/8");
    await expect(page.getByRole("heading", { level: 1, name: "Romans 8" })).toBeVisible();
    await expect.poll(remembered).toBe("web");
    await page.goto("/bible");
    await expect(page).toHaveURL("/bible/web/john/1");
    await page.goto("/bible/bsb/mark/1");
    await expect.poll(remembered).toBe("bsb");
    await page.goto("/bible");
    await expect(page).toHaveURL("/bible/bsb/john/1");
  });

  test("a first visit, an unavailable version or a forged value opens the BSB", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.goto("/bible");
    await expect(page).toHaveURL("/bible/bsb/john/1");
    for (const value of ["esv", "kjv", "..%2F..%2Fweb", "web%3Bpath"]) {
      await context.addCookies([{ name: "bible-version", value, url: baseURL! }]);
      await page.goto("/bible");
      await expect(page, value).toHaveURL("/bible/bsb/john/1");
    }
  });

  test("the cookie is a plain first-party preference: Lax, a year, not readable by other sites", async ({
    page,
    context,
  }) => {
    await page.goto("/bible/web/john/3");
    await expect
      .poll(async () => (await context.cookies()).find((c) => c.name === "bible-version")?.value)
      .toBe("web");
    const cookie = (await context.cookies()).find((c) => c.name === "bible-version")!;
    expect(cookie.sameSite).toBe("Lax");
    expect(cookie.path).toBe("/");
    const days = (cookie.expires - Date.now() / 1000) / 86400;
    expect(days).toBeGreaterThan(360);
    expect(days).toBeLessThanOrEqual(366);
  });

  test("the pages still read fine with no cookie at all", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto("/bible/web/john/3");
    await expect(page.getByRole("heading", { level: 1, name: "John 3" })).toBeVisible();
    await context.close();
  });
});

test("the reader pages log no console errors, which would include a hydration mismatch", async ({
  page,
}) => {
  const problems: string[] = [];
  // /_vercel/* is served by the Vercel platform only, so it is a 404 under a local server.
  const local = (url: string) => url.includes("/_vercel/");
  page.on("console", (m) => {
    const isProblem = m.type() === "error" || m.text().includes("Content Security Policy");
    if (isProblem && !local(m.location().url) && !local(m.text())) problems.push(m.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));

  for (const path of [
    "/bible/bsb/john/3",
    "/bible/bsb/john/3?v=16-18",
    "/bible/web/psalms/23",
    "/bible/bsb/romans/14?v=24-26",
    "/bible/bsb/john/3?v=nonsense",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(problems).toEqual([]);
});
