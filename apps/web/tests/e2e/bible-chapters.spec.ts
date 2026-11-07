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
  await page.getByRole("link", { name: "Next chapter: Matthew 1" }).click();
  await expect(page).toHaveURL("/bible/bsb/matthew/1");
  await page.getByRole("link", { name: "Previous chapter: Malachi 4" }).click();
  await expect(page).toHaveURL("/bible/bsb/malachi/4");
});

test("the first and last chapters of the Bible have a disabled button, not a dead link", async ({
  page,
}) => {
  await page.goto("/bible/bsb/genesis/1");
  let nav = page.getByRole("navigation", { name: "Previous and next chapter" });
  await expect(nav.getByRole("button", { name: /Start of the Bible/ })).toBeDisabled();
  await expect(nav.getByRole("link", { name: /^Previous chapter/ })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Next chapter: Genesis 2" })).toBeVisible();

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

test.describe("on a phone or tablet (below 1024px)", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) >= 1024,
    "from 1024px the buttons sit under the text",
  );

  test("the bar is pinned to the bottom of the screen with two tall buttons in thumb reach", async ({
    page,
  }) => {
    await page.goto(john3);
    const bar = page.getByRole("navigation", { name: "Previous and next chapter" });
    const box = (await bar.boundingBox())!;
    const height = page.viewportSize()!.height;
    expect(box.y + box.height).toBeGreaterThanOrEqual(height - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    const links = await bar.getByRole("link").all();
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

  test("at the end of the page the bar rests above the footer and hides no text", async ({
    page,
  }) => {
    await page.goto("/bible/bsb/psalms/119");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const bar = (await page
      .getByRole("navigation", { name: "Previous and next chapter" })
      .boundingBox())!;
    const footer = (await page.getByRole("contentinfo").boundingBox())!;
    expect(bar.y + bar.height).toBeLessThanOrEqual(footer.y + 1);
    const credit = (await page.getByText("Berean Standard Bible (BSB), dedicated").boundingBox())!;
    expect(credit.y + credit.height).toBeLessThanOrEqual(bar.y + 1);
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

  test("a focused radio keeps its arrow key: the Bible switch changes the Bible, not the chapter", async ({
    page,
  }) => {
    await page.goto(john3);
    const column = page.getByRole("complementary", { name: "Choose passage" });
    await column.getByRole("radio", { name: "BSB" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(john3.replace("bsb", "web"));
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
