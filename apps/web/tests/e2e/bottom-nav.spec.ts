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
