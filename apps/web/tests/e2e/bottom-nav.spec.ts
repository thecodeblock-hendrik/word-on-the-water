import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { BOOKS } from "../../src/lib/bible/books";

// The bar needs the Bible reader and the chat both on, which is the second server (port 3102).
const CHAT = "http://localhost:3102";
const labels = ["Devotional", "Bible", "Ask the Word"];
const devotionalLabels = ["Shore", "Bible", "Ask the Word"];

test.beforeEach(({ viewport }) => {
  test.skip((viewport?.width ?? 0) >= 1024, "The bottom bar is for phones");
});

async function noSeriousProblems(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id} ${v.nodes[0]?.target}`),
    label,
  ).toEqual([]);
}

const pages = [
  ["landing page", "/"],
  ["devotional", "/devotionals/advent-01-more-than-watchmen"],
  ["privacy", "/privacy"],
  ["thank you", "/thank-you"],
  ["not found", "/no-such-page"],
] as const;

for (const [name, path] of pages) {
  test(`${name}: the bar has three visible labels and no serious axe problem, in light and dark`, async ({
    page,
  }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${CHAT}${path}`);
      const bar = page.getByRole("navigation", { name: "Quick links" });
      for (const label of name === "devotional" ? devotionalLabels : labels) {
        await expect(bar.getByText(label, { exact: true })).toBeVisible();
      }
      await noSeriousProblems(page, `${name} ${scheme}`);
    }
  });
}

test("the Bible reader's bar (Shore in the middle) has no serious axe problem, in light and dark", async ({
  page,
}) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`${CHAT}/bible/web/john/3`);
    await expect(page.getByRole("link", { name: "Shore" })).toBeVisible();
    await noSeriousProblems(page, `bible ${scheme}`);
  }
});

test("the bar is reached in reading order and shows a focus ring", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "Safari does not Tab to links unless asked to");
  await page.goto(`${CHAT}/privacy`);
  const bar = page.getByRole("navigation", { name: "Quick links" });
  await bar.getByRole("link", { name: "Devotional" }).focus();
  await expect(bar.getByRole("link", { name: "Devotional" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(bar.getByRole("link", { name: "Bible" })).toBeFocused();
  const ring = await bar
    .getByRole("link", { name: "Bible" })
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(ring).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(bar.getByRole("link", { name: "Ask the Word" })).toBeFocused();
});

test("the chat screen with its bar has no serious axe problem, in light and dark", async ({
  page,
}) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`${CHAT}/`);
    await page.getByRole("navigation", { name: "Quick links" }).getByText("Ask the Word").click();
    const dialog = page.getByRole("dialog", { name: "Ask the Word" });
    await expect(dialog).toBeVisible();
    for (const label of ["Devotional", "Bible", "Shore"]) {
      await expect(dialog.getByText(label, { exact: true })).toBeVisible();
    }
    await noSeriousProblems(page, `chat ${scheme}`);
  }
});

test("the undo toast is announced politely, is clear of the bar and has no serious axe problem", async ({
  page,
}) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`${CHAT}/`);
    await page.getByRole("navigation", { name: "Quick links" }).getByText("Ask the Word").click();
    const dialog = page.getByRole("dialog", { name: "Ask the Word" });
    await dialog.getByRole("textbox", { name: "Your question" }).fill("a draft");
    await dialog.getByRole("button", { name: "Close" }).click();
    const status = page.getByRole("status");
    await expect(status).toContainText("Chat cleared");
    const undo = status.getByRole("button", { name: "Undo" });
    const toast = (await undo.boundingBox())!;
    expect(toast.height).toBeGreaterThanOrEqual(44);
    const barBox = (await page.locator("nav[data-bottom-nav]").boundingBox())!;
    const pillBox = (await undo.locator("..").boundingBox())!;
    expect(barBox.y - (pillBox.y + pillBox.height), "toast to bar").toBeCloseTo(12, 0);
    // Axe reads colours mid-fade as low contrast, so let the fade-in finish first.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    await noSeriousProblems(page, `toast ${scheme}`);
    await undo.click();
    // Undo reopens the chat, which hides the rest of the page from the accessibility tree.
    await expect(page.getByRole("status", { includeHidden: true })).toBeEmpty();
  }
});

test.describe("the glass capsule", () => {
  test("is a 64px frosted bar with three tap targets of at least 44px", async ({ page }) => {
    await page.goto(`${CHAT}/privacy`);
    const nav = bar(page);
    expect((await nav.boundingBox())!.height).toBe(64);
    const blur = await nav.evaluate((el) => {
      const style = getComputedStyle(el);
      return (
        style.getPropertyValue("backdrop-filter") ||
        style.getPropertyValue("-webkit-backdrop-filter")
      );
    });
    expect(blur).toContain("blur(18px)");
    const boxes = await nav
      .getByRole("link")
      .evaluateAll((links) =>
        links.map((link) => link.getBoundingClientRect().toJSON() as DOMRect),
      );
    expect(boxes).toHaveLength(3);
    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(Math.abs(box.width - boxes[0].width)).toBeLessThanOrEqual(1);
    }
  });

  for (const [name, path] of pages) {
    test(`${name}: the end of the page scrolls clear of the bar`, async ({ page }) => {
      await page.goto(`${CHAT}${path}`);
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
      );
      await expect(async () => {
        const footer = (await page.locator("footer").boundingBox())!;
        const nav = (await bar(page).boundingBox())!;
        expect(footer.y + footer.height).toBeLessThanOrEqual(nav.y);
      }).toPass();
    });
  }

  for (const size of [
    { width: 744, height: 1133 },
    { width: 820, height: 1180 },
  ]) {
    test(`on a ${size.width} wide tablet it is 440px wide and centred`, async ({
      page,
    }, testInfo) => {
      test.skip(
        !["pixel-7", "iphone-13"].includes(testInfo.project.name),
        "one mobile Chromium and one mobile WebKit are enough",
      );
      await page.setViewportSize(size);
      await page.goto(`${CHAT}/privacy`);
      const box = (await bar(page).boundingBox())!;
      const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(box.width).toBe(440);
      expect(Math.abs(box.x - (pageWidth - box.x - box.width))).toBeLessThanOrEqual(1);
    });
  }
});

/** The message box row of the open chat, and the bar under it. */
async function chatRowAndBar(page: Page) {
  await page.goto(`${CHAT}/privacy`);
  await bar(page).getByText("Ask the Word").click();
  const dialog = page.getByRole("dialog", { name: "Ask the Word" });
  const row = dialog.getByRole("textbox", { name: "Your question" }).locator("..");
  await expect(row).toBeVisible();
  return {
    dialog,
    row: (await row.boundingBox())!,
    nav: (await dialog.getByRole("navigation", { name: "Quick links" }).boundingBox())!,
  };
}

test("the chat's message pill sits 12px above the bar and lines up with it", async ({ page }) => {
  const { row, nav } = await chatRowAndBar(page);
  expect(nav.y - (row.y + row.height)).toBeCloseTo(12, 0);
  expect(row.x).toBeCloseTo(nav.x, 0);
  expect(row.width).toBeCloseTo(nav.width, 0);
});

for (const size of [
  { width: 744, height: 1133 },
  { width: 820, height: 1180 },
]) {
  test(`on a ${size.width} wide tablet the message pill and the toast match the bar`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "one mobile Chromium and one mobile WebKit are enough",
    );
    await page.setViewportSize(size);
    const { dialog, row, nav } = await chatRowAndBar(page);
    expect(row.width).toBeCloseTo(440, 0);
    expect(row.x).toBeCloseTo(nav.x, 0);

    await dialog.getByRole("textbox", { name: "Your question" }).fill("a draft");
    await dialog.getByRole("button", { name: "Close" }).click();
    const toast = (await page.getByRole("button", { name: "Undo" }).locator("..").boundingBox())!;
    const siteBar = (await bar(page).boundingBox())!;
    expect(toast.width).toBeCloseTo(440, 0);
    expect(toast.x).toBeCloseTo(siteBar.x, 0);
    expect(siteBar.y - (toast.y + toast.height)).toBeCloseTo(12, 0);
  });
}

const chapterBar = (page: Page) =>
  page.getByRole("navigation", { name: "Previous and next chapter" });

test("every book's short name fits its tab on one line at 320 wide", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`${CHAT}/bible/web/john/3`);
  await page.evaluate(() => document.fonts.ready);
  // The widest label of each book: its short name with its last chapter.
  const labels = BOOKS.map((book) => `${book.short} ${book.chapters}`);
  const tooWide = await chapterBar(page)
    .getByRole("link", { name: /^Next chapter/ })
    .evaluate((link, names) => {
      const place = link.querySelector<HTMLElement>(".truncate")!;
      const short = place.querySelector<HTMLElement>("span:last-child")!;
      return names.filter((name) => {
        short.textContent = name;
        return place.scrollWidth > place.clientWidth || place.getBoundingClientRect().height > 20;
      });
    }, labels);
  expect(tooWide).toEqual([]);
});

for (const size of [
  { width: 744, height: 1133 },
  { width: 820, height: 1180 },
]) {
  test(`on a ${size.width} wide tablet the Bible reader's bar is 440px and centred`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "one mobile Chromium and one mobile WebKit are enough",
    );
    await page.setViewportSize(size);
    await page.goto(`${CHAT}/bible/web/john/3`);
    const box = (await chapterBar(page).boundingBox())!;
    const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(box.width).toBeCloseTo(440, 0);
    expect(box.height).toBe(64);
    expect(Math.abs(box.x - (pageWidth - box.x - box.width))).toBeLessThanOrEqual(1);
  });
}

// The latest published devotional on the pinned test day (5 December 2026).
const DEVOTIONAL = "/devotionals/advent-02-the-long-wait";
const bar = (page: Page) => page.getByRole("navigation", { name: "Quick links" });
const chatDialog = (page: Page) => page.getByRole("dialog", { name: "Ask the Word" });

async function openChatFromBar(page: Page, path = "/") {
  await page.goto(`${CHAT}${path}`);
  await bar(page).getByText("Ask the Word").click();
  await expect(chatDialog(page)).toBeVisible();
  return chatDialog(page);
}

async function askJesus(page: Page) {
  const dialog = chatDialog(page);
  await dialog.getByRole("button", { name: "Who is Jesus?" }).click();
  await expect(dialog.getByText("Short answer 2.1.")).toBeVisible();
  return dialog;
}

test.describe("where each button goes", () => {
  test("Devotional, Shore, Bible and Ask the Word from the landing page", async ({ page }) => {
    await page.goto(`${CHAT}/`);
    await bar(page).getByRole("link", { name: "Devotional" }).click();
    await expect(page).toHaveURL(`${CHAT}${DEVOTIONAL}`);
    await expect(bar(page).getByRole("link", { name: "Devotional" })).toHaveCount(0);
    await expect(bar(page).locator("[aria-current]")).toHaveCount(0);
    await bar(page).getByRole("link", { name: "Shore" }).click();
    await expect(page).toHaveURL(`${CHAT}/`);

    await bar(page).getByRole("link", { name: "Bible" }).click();
    await expect(page).toHaveURL(/\/bible\/[a-z]+\/[a-z0-9-]+\/\d+/);
    await expect(page.getByRole("link", { name: "Shore" })).toBeVisible();

    await page.getByRole("link", { name: "Shore" }).click();
    await expect(page).toHaveURL(`${CHAT}/`);

    await bar(page).getByText("Ask the Word").click();
    await expect(chatDialog(page)).toBeVisible();
    await expect(page).toHaveURL(`${CHAT}/`);
  });

  for (const [name, target] of [
    ["Devotional", DEVOTIONAL],
    ["Bible", "/bible/"],
    ["Shore", "/"],
  ] as const) {
    test(`${name} on the chat screen leaves the chat and goes there`, async ({ page }) => {
      const dialog = await openChatFromBar(page, "/privacy");
      await dialog.getByRole("link", { name, exact: true }).click();
      await expect(chatDialog(page)).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`${CHAT}${target}`));
    });
  }
});

/** Two frames: the scroll event has been delivered and the page has drawn. No fixed sleeps. */
const frames = (page: Page) =>
  page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );

test("Devotional opens the devotional at its top, wherever the landing page was scrolled to", async ({
  page,
}) => {
  // The smooth scrolling set on <html> once sent a tap from the top of the landing page down to the
  // devotional's Subscribe band, because the router's scroll and the smooth scroll fought.
  for (const fraction of [0, 0.5, 1]) {
    await page.goto(`${CHAT}/`);
    await page.waitForLoadState("networkidle");
    await page.evaluate(
      (f) =>
        window.scrollTo({
          top: f * (document.documentElement.scrollHeight - innerHeight),
          behavior: "instant",
        }),
      fraction,
    );
    await frames(page); // or the next scroll could merge with this one into a single event
    // Partway down, the bar is away: a little scroll up brings it back, as a visitor would.
    await page.evaluate(() => window.scrollBy({ top: -10, behavior: "instant" }));
    await frames(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-nav-away", "");
    await bar(page).getByRole("link", { name: "Devotional" }).click();
    await expect(page).toHaveURL(`${CHAT}${DEVOTIONAL}`);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => Math.round(scrollY)), `from ${fraction}`).toBeLessThan(5);
  }
});

test.describe("the chat, the Bible and back", () => {
  test("a verse keeps the chat, Your chat brings it back, closing it makes the Bible show Shore, and a new chat starts empty", async ({
    page,
  }) => {
    const dialog = await openChatFromBar(page);
    await askJesus(page);
    await dialog.getByRole("link", { name: "John 3:16" }).click();
    await expect(page).toHaveURL(/\/bible\/web\/john\/3\?v=16/);

    const yourChat = page.getByRole("button", { name: "Your chat", exact: true });
    await expect(yourChat).toBeVisible();
    await expect(page.getByRole("link", { name: "Shore" })).toHaveCount(0);

    await yourChat.click();
    await expect(chatDialog(page).getByText("Short answer 2.1.")).toBeVisible();
    await chatDialog(page).getByRole("button", { name: "Close" }).click();
    await expect(chatDialog(page)).toHaveCount(0);

    await expect(page.getByRole("button", { name: "Your chat", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Shore" })).toBeVisible();

    await page.getByRole("link", { name: "Shore" }).click();
    await bar(page).getByText("Ask the Word").click();
    await expect(chatDialog(page).getByRole("button", { name: "Who is Jesus?" })).toBeVisible();
    await expect(chatDialog(page).getByText("Short answer 2.1.")).toHaveCount(0);
  });

  test("leaving by a bar button clears the chat, and Undo brings it back on the new page", async ({
    page,
  }) => {
    const dialog = await openChatFromBar(page);
    await askJesus(page);
    await dialog.getByRole("link", { name: "Bible", exact: true }).click();
    await expect(page).toHaveURL(/\/bible\//);

    await expect(page.getByRole("status")).toContainText("Chat cleared");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(chatDialog(page).getByText("Short answer 2.1.")).toBeVisible();
    await expect(chatDialog(page).getByText("Who is Jesus?").first()).toBeVisible();
  });

  test("without Undo the cleared chat is gone for good", async ({ page }) => {
    const dialog = await openChatFromBar(page);
    await askJesus(page);
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("status")).toContainText("Chat cleared");
    await bar(page).getByText("Ask the Word").click();
    await expect(chatDialog(page).getByText("Short answer 2.1.")).toHaveCount(0);
    await expect(page.getByRole("status", { includeHidden: true })).toBeEmpty();
  });
});

test.describe("the solid fallbacks", () => {
  /** What decides whether a bar is see-through: its blur, and the alpha of its background. */
  const look = (nav: ReturnType<typeof bar>) =>
    nav.evaluate((el) => {
      const style = getComputedStyle(el);
      const background = style.backgroundColor;
      const alpha = background.match(/\/\s*([\d.]+)\)$|^rgba\([^)]*,\s*([\d.]+)\)$/);
      return {
        blur: style.getPropertyValue("backdrop-filter") || "none",
        alpha: alpha ? Number(alpha[1] ?? alpha[2]) : 1,
      };
    });

  const bars = [
    ["the site bar", "/privacy", bar],
    ["the Bible reader's bar", "/bible/web/john/3", chapterBar],
  ] as const;

  for (const [name, path, find] of bars) {
    test(`${name} is see-through by default`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "pixel-7", "measured in one mobile Chromium");
      await page.goto(`${CHAT}${path}`);
      const { blur, alpha } = await look(find(page));
      expect(blur).toContain("blur(18px)");
      expect(alpha).toBeCloseTo(0.72, 2);
    });

    test(`${name} is solid with increased contrast`, async ({ page }, testInfo) => {
      test.skip(
        !["pixel-7", "iphone-13"].includes(testInfo.project.name),
        "one mobile Chromium and one mobile WebKit are enough",
      );
      await page.emulateMedia({ contrast: "more" });
      await page.goto(`${CHAT}${path}`);
      expect(await page.evaluate(() => matchMedia("(prefers-contrast: more)").matches)).toBe(true);
      await expect.poll(() => look(find(page))).toEqual({ blur: "none", alpha: 1 });
    });

    test(`${name} is solid with reduced transparency`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "pixel-7", "only Chromium can emulate this setting");
      const session = await page.context().newCDPSession(page);
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
      });
      await page.goto(`${CHAT}${path}`);
      expect(
        await page.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches),
      ).toBe(true);
      await expect.poll(() => look(find(page))).toEqual({ blur: "none", alpha: 1 });
    });

    test(`${name} is solid in forced-colours mode`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "pixel-7", "measured in one mobile Chromium");
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(`${CHAT}${path}`);
      await expect.poll(() => look(find(page))).toEqual({ blur: "none", alpha: 1 });
    });
  }
});

test.describe("the liquid pill", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "one mobile Chromium and one mobile WebKit are enough",
    );
  });

  const pillOf = (nav: ReturnType<typeof bar>) => nav.locator("[data-pill]");

  /** Presses on a tab, without letting go. */
  async function press(page: Page, tab: ReturnType<Page["locator"]>) {
    const box = (await tab.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    return box;
  }

  const centre = (box: { x: number; width: number }) => box.x + box.width / 2;

  for (const [name, path, find, tabName] of [
    ["the site bar", "/privacy", bar, "Bible"],
    ["the Bible reader's bar", "/bible/web/john/3", chapterBar, "Shore"],
  ] as const) {
    test(`on ${name} it sits under the pressed tab, then fades, with no CSP violation`, async ({
      page,
    }) => {
      const violations: string[] = [];
      page.on("console", (m) => {
        if (m.text().includes("Content Security Policy")) violations.push(m.text());
      });
      await page.goto(`${CHAT}${path}`);
      await page.waitForLoadState("networkidle");
      const nav = find(page);
      const pill = pillOf(nav);
      await expect(pill).toHaveCSS("opacity", "0");

      const tab = await press(page, nav.getByRole("link", { name: tabName }));
      await expect(pill).toHaveCSS("opacity", "1");
      await expect
        .poll(async () => Math.abs(centre((await pill.boundingBox())!) - centre(tab)))
        .toBeLessThan(1.5);

      // Letting go away from the tab opens nothing.
      await page.mouse.move(tab.x + tab.width / 2, tab.y - 200, { steps: 4 });
      await page.mouse.up();
      await expect(pill).toHaveCSS("opacity", "0");
      await expect(page).toHaveURL(`${CHAT}${path}`);
      expect(violations).toEqual([]);
    });
  }

  test("a tap opens the page, and the pill on the bar there fades", async ({ page }) => {
    await page.goto(`${CHAT}/`);
    await page.waitForLoadState("networkidle");
    await bar(page).getByRole("link", { name: "Devotional" }).click();
    await expect(page).toHaveURL(`${CHAT}${DEVOTIONAL}`);
    await expect(pillOf(bar(page))).toHaveCSS("opacity", "0");
  });

  test("Enter on a tab shows the pill and opens the page", async ({ page }) => {
    await page.goto(`${CHAT}/privacy`);
    await page.waitForLoadState("networkidle");
    await bar(page).getByRole("link", { name: "Devotional" }).focus();
    // The pill shows only briefly, so note that it did rather than try to catch it on screen.
    await pillOf(bar(page)).evaluate((pill) => {
      new MutationObserver(() => {
        if (pill.hasAttribute("data-on")) document.body.dataset.pillShown = "yes";
      }).observe(pill, { attributes: true });
    });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${CHAT}${DEVOTIONAL}`);
    await expect(page.locator("body")).toHaveAttribute("data-pill-shown", "yes");
    await expect(pillOf(bar(page))).toHaveCSS("opacity", "0");
  });

  test("with reduced motion it is exactly on the tab at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${CHAT}/privacy`);
    await page.waitForLoadState("networkidle");
    const tab = await press(page, bar(page).getByRole("link", { name: "Bible" }));
    const pill = (await pillOf(bar(page)).boundingBox())!;
    expect(pill.x).toBeCloseTo(tab.x, 0);
    expect(pill.width).toBeCloseTo(tab.width, 0);
    await page.mouse.up();
  });
});

test.describe("hold and slide", () => {
  /** The middle of a tab on screen. */
  async function middle(tab: ReturnType<Page["locator"]>) {
    const box = (await tab.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
  }

  async function ready(page: Page, path: string) {
    await page.goto(`${CHAT}${path}`);
    await page.waitForLoadState("networkidle");
  }

  const entries = (page: Page) => page.evaluate(() => history.length);

  async function slideWithMouse(
    page: Page,
    from: ReturnType<Page["locator"]>,
    to: ReturnType<Page["locator"]>,
  ) {
    const start = await middle(from);
    const end = await middle(to);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  }

  test("from Devotional to Bible opens the Bible, once", async ({ page }) => {
    await ready(page, "/privacy");
    const before = await entries(page);
    const link = (name: string) => bar(page).getByRole("link", { name });
    await slideWithMouse(page, link("Devotional"), link("Bible"));
    await expect(page).toHaveURL(/\/bible\/[a-z]+\/[a-z0-9-]+\/\d+/);
    await expect(chapterBar(page)).toBeVisible();
    expect(await entries(page)).toBe(before + 1);
  });

  test("on to Ask the Word opens the chat in place", async ({ page }) => {
    await ready(page, "/privacy");
    const link = (name: string) => bar(page).getByRole("link", { name });
    await slideWithMouse(page, link("Devotional"), link("Ask the Word"));
    await expect(chatDialog(page)).toHaveCount(1);
    await expect(page).toHaveURL(`${CHAT}/privacy`);
  });

  test("in the Bible reader from Shore to Next opens the next chapter", async ({ page }) => {
    await ready(page, "/bible/web/john/3");
    const nav = chapterBar(page);
    await slideWithMouse(
      page,
      nav.getByRole("link", { name: "Shore" }),
      nav.getByRole("link", { name: /^Next chapter/ }),
    );
    await expect(page).toHaveURL(`${CHAT}/bible/web/john/4`);
  });

  test.describe("with real touches", () => {
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== "pixel-7", "only Chromium can send touch sequences");
    });

    async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
      const session = await page.context().newCDPSession(page);
      const send = (type: "touchStart" | "touchMove" | "touchEnd", point?: typeof from) =>
        session.send("Input.dispatchTouchEvent", {
          type,
          touchPoints: point ? [{ x: point.x, y: point.y }] : [],
        });
      await send("touchStart", from);
      for (let step = 1; step <= 8; step++) {
        await send("touchMove", {
          x: from.x + ((to.x - from.x) * step) / 8,
          y: from.y + ((to.y - from.y) * step) / 8,
        });
      }
      await send("touchEnd");
    }

    test("a slide to the next tab opens it, once, and the page does not scroll", async ({
      page,
    }) => {
      await ready(page, "/privacy");
      const before = await entries(page);
      const from = await middle(bar(page).getByRole("link", { name: "Devotional" }));
      const to = await middle(bar(page).getByRole("link", { name: "Bible" }));
      await swipe(page, from, to);
      await expect(page).toHaveURL(/\/bible\//);
      await expect(chapterBar(page)).toBeVisible();
      expect(await entries(page)).toBe(before + 1);
    });

    test("a short slide over the line between two tabs opens only the second", async ({ page }) => {
      await ready(page, "/privacy");
      const before = await entries(page);
      const first = await middle(bar(page).getByRole("link", { name: "Devotional" }));
      const edge = first.box.x + first.box.width;
      await swipe(page, { x: edge - 7, y: first.y }, { x: edge + 7, y: first.y });
      await expect(page).toHaveURL(/\/bible\//);
      await expect(chapterBar(page)).toBeVisible();
      expect(await entries(page)).toBe(before + 1);
    });

    test("a slide up off the bar opens nothing and does not scroll the page", async ({ page }) => {
      await ready(page, "/privacy");
      const from = await middle(bar(page).getByRole("link", { name: "Devotional" }));
      await swipe(page, from, { x: from.x, y: from.y - 250 });
      await expect(bar(page).locator("[data-pill]")).toHaveCSS("opacity", "0");
      await expect(page).toHaveURL(`${CHAT}/privacy`);
      expect(await page.evaluate(() => scrollY)).toBe(0);
    });

    test("a plain tap still opens the tab, once", async ({ page }) => {
      await ready(page, "/privacy");
      const before = await entries(page);
      await bar(page).getByRole("link", { name: "Devotional" }).tap();
      await expect(page).toHaveURL(`${CHAT}${DEVOTIONAL}`);
      expect(await entries(page)).toBe(before + 1);
    });
  });
});

test.describe("hiding while scrolling", () => {
  async function scroll(page: Page, top: number) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    await frames(page);
  }

  async function ready(page: Page, path: string) {
    await page.goto(`${CHAT}${path}`);
    await page.waitForLoadState("networkidle");
  }

  /** How far the top of a bar is above the bottom of the screen: 0 or less when fully away. */
  const showing = (nav: ReturnType<Page["locator"]>) =>
    nav.evaluate((el) => Math.round(window.innerHeight - el.getBoundingClientRect().top));
  const SHOWN = 78; // 64px of bar, 14px up where there is no home indicator

  const expectShown = (nav: ReturnType<Page["locator"]>) =>
    expect.poll(() => showing(nav)).toBe(SHOWN);
  const expectAway = (nav: ReturnType<Page["locator"]>) =>
    expect.poll(() => showing(nav)).toBeLessThanOrEqual(0);

  for (const [name, path, find] of [
    ["the site bar", "/privacy", bar],
    ["the Bible reader's bar", "/bible/web/psalms/119", chapterBar],
  ] as const) {
    test(`${name} leaves on the way down, returns on the way up and is there at the end`, async ({
      page,
    }) => {
      await ready(page, path);
      const nav = find(page);
      await expectShown(nav);
      const padding = () => page.evaluate(() => getComputedStyle(document.body).paddingBottom);
      const before = await padding();

      await scroll(page, 600);
      await expectAway(nav);
      expect(await padding()).toBe(before); // nothing jumps

      await scroll(page, 590);
      await expectShown(nav);
      await scroll(page, 700);
      await expectAway(nav);

      await scroll(page, 1_000_000);
      await expectShown(nav);
    });
  }

  test("a new chapter shows the bar again", async ({ page }) => {
    await ready(page, "/bible/web/psalms/119");
    await scroll(page, 600);
    await expectAway(chapterBar(page));
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(`${CHAT}/bible/web/psalms/120`);
    await expectShown(chapterBar(page));
  });

  test("keyboard focus brings a hidden bar back, and it is still in the accessibility tree", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Safari does not Tab to links unless asked to");
    await ready(page, "/privacy");
    await scroll(page, 600);
    const nav = bar(page);
    await expectAway(nav);
    await expect(nav.getByRole("link")).toHaveCount(3);
    // Tab on from the last link before the bar, without scrolling to it.
    await page
      .locator("footer a")
      .last()
      .evaluate((el: HTMLElement) => el.focus({ preventScroll: true }));
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "Devotional" })).toBeFocused();
    await expectShown(nav);
    await page.keyboard.press("Shift+Tab");
    await expect(nav.getByRole("link", { name: "Devotional" })).not.toBeFocused();
  });

  test("the Undo toast stays, drops into the bar's place and goes back up with it", async ({
    page,
  }) => {
    await ready(page, "/privacy");
    await bar(page).getByText("Ask the Word").click();
    await chatDialog(page).getByRole("textbox", { name: "Your question" }).fill("a draft");
    await chatDialog(page).getByRole("button", { name: "Close" }).click();
    const toast = page.getByRole("button", { name: "Undo" }).locator("..");
    const fromBottom = () =>
      toast.evaluate((el) => Math.round(window.innerHeight - el.getBoundingClientRect().bottom));
    await expect.poll(fromBottom).toBe(SHOWN + 12);
    // Focus on Undo holds the toast's timer, so it cannot expire while this is measured.
    await page.getByRole("button", { name: "Undo" }).focus();
    await scroll(page, 600);
    await expectAway(bar(page));
    await expect.poll(fromBottom).toBe(14);
    await scroll(page, 580);
    await expect.poll(fromBottom).toBe(SHOWN + 12);
  });

  test("the chat's bar stays, even opened over a page whose bar is away", async ({ page }) => {
    await ready(page, "/privacy");
    await scroll(page, 600);
    await expectAway(bar(page));
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "Ask the Word" }).click();
    await expectShown(chatDialog(page).getByRole("navigation", { name: "Quick links" }));
  });

  test("with reduced motion the bar does not slide", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, "/privacy");
    const seconds = await bar(page).evaluate((el) =>
      parseFloat(getComputedStyle(el).transitionDuration),
    );
    expect(seconds).toBeLessThanOrEqual(0.00001);
    await scroll(page, 600);
    await expectAway(bar(page));
  });
});

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1280, height: 700 } });

  test("the chapter buttons under the text are never moved", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "pixel-7", "one run is enough");
    await page.goto(`${CHAT}/bible/web/psalms/119`);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await expect(page.locator("html")).toHaveAttribute("data-nav-away", "");
    expect(await chapterBar(page).evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  });
});
