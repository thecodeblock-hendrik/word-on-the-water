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

async function noSeriousProblems(page: Page, label: string, only: string[] = []) {
  const axe = new AxeBuilder({ page });
  for (const part of only) axe.include(part);
  const { violations } = await axe.analyze();
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

/** Leaves the chat with a draft in it, by its Close button, so the Undo shelf is up. */
async function leaveChatWithDraft(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Ask the Word" });
  await dialog.getByRole("textbox", { name: "Your question" }).fill("a draft");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
  // The dialog hands focus back to what opened it a moment after it has gone. Wait for that, or it
  // can arrive after a test has focused Undo, taking focus (and the hold on its timer) away again.
  await expect.poll(() => page.evaluate(() => document.activeElement !== document.body)).toBe(true);
}

/** Waits for the shelf to finish moving (the countdown ring's own time is not waited for). */
const settled = (page: Page) =>
  page.locator("[data-shelf]").evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .filter((a) => (a as CSSAnimation).animationName !== "countdown")
        .map((a) => a.finished),
    ),
  );

/** The shelf up over the site bar of `/privacy`, or over the Bible reader's bar. */
async function openShelf(page: Page, on: "site" | "reader") {
  await page.goto(`${CHAT}/privacy`);
  await page.waitForLoadState("networkidle");
  const quick = page.getByRole("navigation", { name: "Quick links" });
  await quick.getByText("Ask the Word").click();
  const dialog = page.getByRole("dialog", { name: "Ask the Word" });
  if (on === "reader") {
    await dialog.getByRole("textbox", { name: "Your question" }).fill("a draft");
    await dialog.getByRole("link", { name: "Bible" }).click();
    await expect(page).toHaveURL(/\/bible\/[a-z]+\//);
  } else {
    await leaveChatWithDraft(page);
  }
  const undo = page.getByRole("button", { name: "Undo" });
  await expect(undo).toBeVisible();
  const bar =
    on === "reader" ? page.getByRole("navigation", { name: "Previous and next chapter" }) : quick;
  // Focus on Undo holds the 8 second timer, so the shelf cannot go while it is measured.
  await undo.focus();
  await settled(page);
  return { undo, bar, shelf: page.locator("[data-shelf]") };
}

/** How the bar's own glass is drawn. */
const glassOf = (bar: ReturnType<Page["locator"]>) =>
  bar.evaluate((el) => {
    const style = getComputedStyle(el);
    return [
      style.backgroundColor,
      style.backdropFilter || style.getPropertyValue("-webkit-backdrop-filter"),
      style.boxShadow,
    ];
  });
const NO_GLASS = ["rgba(0, 0, 0, 0)", "none", "none"];

test("the Undo shelf is announced politely and has no serious axe problem, in light and dark", async ({
  page,
}) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const { undo } = await openShelf(page, "site");
    await expect(page.getByRole("status")).toContainText("Chat cleared");
    expect((await undo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await noSeriousProblems(page, `shelf ${scheme}`);
    await undo.click();
    // Undo reopens the chat, which hides the rest of the page from the accessibility tree.
    await expect(page.getByRole("status", { includeHidden: true })).toBeEmpty();
  }
});

for (const on of ["site", "reader"] as const) {
  for (const width of [320, 375, 744, 820]) {
    test(`the shelf and the ${on} bar are one pane at ${width} wide, and everything can be tapped`, async ({
      page,
    }, testInfo) => {
      test.skip(
        !["pixel-7", "iphone-13"].includes(testInfo.project.name),
        "one mobile Chromium and one mobile WebKit are enough",
      );
      await page.setViewportSize({ width, height: width < 700 ? 700 : 1133 });
      const { undo, bar, shelf } = await openShelf(page, on);
      const pane = (await shelf.boundingBox())!;
      const barBox = (await bar.boundingBox())!;
      expect(pane.x).toBeCloseTo(barBox.x, 0);
      expect(pane.width).toBeCloseTo(barBox.width, 0);
      expect(pane.width).toBeLessThanOrEqual(440);
      expect(barBox.y - pane.y, "shelf above the bar").toBeCloseTo(52, 0);
      expect(pane.y + pane.height, "same bottom edge").toBeCloseTo(barBox.y + barBox.height, 0);
      expect(await glassOf(bar), "the bar draws no second pane").toEqual(NO_GLASS);

      const tabs = bar.locator("a, button");
      await expect(tabs).toHaveCount(3);
      const undoBox = (await undo.boundingBox())!;
      for (const tab of await tabs.all()) {
        const box = (await tab.boundingBox())!;
        expect(box.y, "tabs start under Undo").toBeGreaterThanOrEqual(undoBox.y + undoBox.height);
      }
      // What a finger would land on, in the middle of each, is that thing itself.
      for (const target of [undo, ...(await tabs.all())]) {
        const hit = await target.evaluate((el) => {
          const { x, y, width, height } = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(x + width / 2, y + height / 2));
        });
        expect(hit).toBe(true);
      }
    });
  }
}

test("without the shelf the bar has its own glass, and it comes back when the shelf goes", async ({
  page,
}) => {
  await page.goto(`${CHAT}/privacy`);
  const quick = page.getByRole("navigation", { name: "Quick links" });
  const own = await glassOf(quick);
  expect(own).not.toEqual(NO_GLASS);
  const { bar, shelf } = await openShelf(page, "site");
  expect(await glassOf(bar)).toEqual(NO_GLASS);
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await expect(shelf).toHaveCount(0, { timeout: 10_000 }); // the 8 seconds run out
  expect(await glassOf(bar)).toEqual(own);
});

test("after Undo by keyboard, the next Undo shelf still goes when its time is up", async ({
  page,
}) => {
  const { undo, shelf } = await openShelf(page, "site"); // leaves focus on Undo
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Ask the Word" });
  await dialog.getByRole("button", { name: "Close" }).click(); // the draft is cleared again
  await expect(undo).toBeVisible();
  await expect(shelf).toHaveCount(0, { timeout: 10_000 }); // 8 seconds are offered
});

test.describe("the countdown ring in Undo", () => {
  /** How much of the ring has gone (0 to 100), and the animation doing it. */
  const readRing = (page: Page) =>
    page.locator("[data-shelf] .countdown-time").evaluate((el) => {
      const [running] = el.getAnimations();
      return {
        gone: parseFloat(getComputedStyle(el).strokeDashoffset),
        animation: getComputedStyle(el).animationName,
        playedMs: running ? Number(running.currentTime) : null,
      };
    });

  test("empties over the 8 seconds, is full while Undo has focus, and starts again, with no CSP violation", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const refused: string[] = [];
      (window as unknown as { refused: string[] }).refused = refused;
      document.addEventListener("securitypolicyviolation", (e) => {
        // Opening the chat, Zod (which checks the replies) tries once whether it may use eval, in a
        // try block, and does without it when the policy says no. Nothing else may be refused.
        if (e.blockedURI !== "eval") refused.push(`${e.effectiveDirective} ${e.blockedURI}`);
      });
    });
    const { undo } = await openShelf(page, "site"); // leaves focus on Undo
    expect(await readRing(page)).toEqual({ gone: 0, animation: "none", playedMs: null });

    await undo.evaluate((el: HTMLElement) => el.blur());
    expect((await readRing(page)).animation).toBe("countdown");
    await expect(page.locator("[data-shelf] .countdown-time")).toHaveCSS(
      "animation-duration",
      "8s",
    );
    await expect.poll(async () => (await readRing(page)).gone).toBeGreaterThan(10);

    await undo.focus();
    expect(await readRing(page)).toEqual({ gone: 0, animation: "none", playedMs: null });
    await undo.evaluate((el: HTMLElement) => el.blur());
    expect((await readRing(page)).playedMs, "from the beginning again").toBeLessThan(1000);

    expect(await page.evaluate(() => (window as unknown as { refused: string[] }).refused)).toEqual(
      [],
    );
  });

  test("with reduced motion it stays full", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { undo } = await openShelf(page, "site");
    await undo.evaluate((el: HTMLElement) => el.blur());
    await frames(page);
    expect(await readRing(page)).toEqual({ gone: 0, animation: "none", playedMs: null });
  });
});

test.describe("the shelf growing and settling", () => {
  type Frame = { height: number; words: number; buttons: number; closing: boolean; glass: string };

  /** Notes the shelf and the bar under it at every frame in which the shelf is there. */
  const watchShelf = (page: Page) =>
    page.evaluate(() => {
      const frames: unknown[] = [];
      (window as unknown as { shelfFrames: unknown[] }).shelfFrames = frames;
      const look = () => {
        const shelf = document.querySelector("[data-shelf]");
        const nav = document.querySelector("nav[data-hides]");
        if (shelf && nav) {
          frames.push({
            height: Math.round(shelf.getBoundingClientRect().height),
            words: Number(getComputedStyle(shelf.querySelector("[data-shelf-row]")!).opacity),
            buttons: shelf.querySelectorAll("button").length,
            closing: shelf.getAttribute("data-shelf") === "closing",
            glass: getComputedStyle(nav).backgroundColor,
          });
        }
        requestAnimationFrame(look);
      };
      look();
    });
  const framesSeen = (page: Page) =>
    page.evaluate(() => (window as unknown as { shelfFrames: Frame[] }).shelfFrames);

  /** The chat left with a draft in it, from `/privacy`, with every frame of the shelf noted. */
  async function leaveAndWatch(page: Page) {
    await page.goto(`${CHAT}/privacy`);
    await page.waitForLoadState("networkidle");
    await bar(page).getByText("Ask the Word").click();
    await watchShelf(page);
    await leaveChatWithDraft(page);
    await expect(page.locator("[data-shelf]")).toHaveCount(1);
    await settled(page);
  }

  test("it grows out of the bar, its words unseen until they are clear of the tabs", async ({
    page,
  }) => {
    await leaveAndWatch(page);
    const seen = await framesSeen(page);
    expect(seen[0].height, "starts at about the bar's height").toBeLessThan(90);
    expect(seen.at(-1)).toMatchObject({ height: 116, words: 1 });
    expect(new Set(seen.map((f) => f.height)).size, "it moved, not jumped").toBeGreaterThan(3);
    // The words are the shelf's top 52px; below about 106px they would reach into the tabs.
    expect(seen.filter((f) => f.height < 100 && f.words > 0.35)).toEqual([]);
    expect(
      seen.filter((f) => f.glass !== "rgba(0, 0, 0, 0)"),
      "always one pane",
    ).toEqual([]);
  });

  test("when time runs out it settles into the bar, with nothing to tap, and the bar gets its glass back", async ({
    page,
  }) => {
    const own = await (async () => {
      await page.goto(`${CHAT}/privacy`);
      return bar(page).evaluate((el) => getComputedStyle(el).backgroundColor);
    })();
    await leaveAndWatch(page);
    await expect(page.locator("[data-shelf]")).toHaveCount(0, { timeout: 12_000 });
    const closing = (await framesSeen(page)).filter((f) => f.closing);
    expect(closing.length, "it was seen closing").toBeGreaterThan(3);
    expect(closing.filter((f) => f.buttons > 0)).toEqual([]);
    expect(Math.min(...closing.map((f) => f.height))).toBeLessThan(80);
    expect(closing.filter((f) => f.glass !== "rgba(0, 0, 0, 0)")).toEqual([]);
    await expect
      .poll(() => bar(page).evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(own);
  });

  test("scrolling after it has appeared does not play the entrance again", async ({ page }) => {
    await leaveAndWatch(page);
    const moving = () =>
      page.locator("[data-shelf]").evaluate((el) =>
        el
          .getAnimations({ subtree: true })
          .filter((a) => a.playState === "running")
          .map((a) => (a as CSSAnimation).animationName ?? "transition"),
      );
    await page.getByRole("button", { name: "Undo" }).focus(); // holds the timer
    for (const top of [600, 0]) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
      await frames(page);
      expect((await moving()).filter((name) => name?.startsWith("shelf-"))).toEqual([]);
    }
  });

  test("with reduced motion it appears at its height and goes at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await leaveAndWatch(page);
    await expect(page.locator("[data-shelf]")).toHaveCount(0, { timeout: 12_000 });
    const seen = await framesSeen(page);
    expect(seen.filter((f) => f.height !== 116 || f.words !== 1 || f.closing)).toEqual([]);
  });

  /** Notes every layout shift that Chrome would count against the page. */
  const countShifts = (page: Page) =>
    page.addInitScript(() => {
      const shifts: number[] = [];
      (window as unknown as { shifts: number[] }).shifts = shifts;
      new PerformanceObserver((list) => {
        type Shift = PerformanceEntry & { value: number; hadRecentInput: boolean };
        for (const entry of list.getEntries() as Shift[]) {
          if (!entry.hadRecentInput) shifts.push(entry.value);
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
  const shiftsSoFar = (page: Page) =>
    page.evaluate(() => (window as unknown as { shifts: number[] }).shifts);
  const total = (shifts: number[]) => shifts.reduce((sum, value) => sum + value, 0);

  test("settling shifts nothing on the page", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "only Chromium reports layout shifts");
    await countShifts(page);
    await leaveAndWatch(page);
    const before = (await shiftsSoFar(page)).length;
    await expect(page.locator("[data-shelf]")).toHaveCount(0, { timeout: 12_000 });
    await frames(page);
    expect(total((await shiftsSoFar(page)).slice(before))).toBeLessThan(0.001);
  });

  test("scrolling away and back with the shelf up shifts nothing either, time after time", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "only Chromium reports layout shifts");
    await countShifts(page);
    await leaveAndWatch(page);
    await page.getByRole("button", { name: "Undo" }).focus(); // holds the timer
    // A scroll made by a script is not "input", so any shift after it is counted.
    const before = (await shiftsSoFar(page)).length;
    const height = () =>
      page.locator("[data-shelf]").evaluate((el) => Math.round(el.getBoundingClientRect().height));
    for (const top of [400, 600, 800]) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
      await expect.poll(height).toBe(54); // the bar is away
      await expect.poll(height).toBe(116); // the scrolling stopped: joined again
      await settled(page);
    }
    await frames(page);
    expect(total((await shiftsSoFar(page)).slice(before))).toBeLessThan(0.001);
  });

  test("its bottom edge stays put in every frame while it grows, shrinks and settles", async ({
    page,
  }) => {
    await page.goto(`${CHAT}/privacy`);
    await page.waitForLoadState("networkidle");
    await bar(page).getByText("Ask the Word").click();
    await page.evaluate(() => {
      const seen: [number, number][] = [];
      (window as unknown as { edges: [number, number][] }).edges = seen;
      const look = () => {
        const box = document.querySelector("[data-shelf]")?.getBoundingClientRect();
        if (box) seen.push([window.innerHeight - box.bottom, Math.round(box.height)]);
        requestAnimationFrame(look);
      };
      look();
    });
    await leaveChatWithDraft(page);
    await settled(page);
    const undo = page.getByRole("button", { name: "Undo" });
    await undo.focus();
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await page.waitForFunction(
      () => document.querySelector("[data-shelf]")!.getBoundingClientRect().height < 55,
    );
    await page.waitForFunction(
      () => document.querySelector("[data-shelf]")!.getBoundingClientRect().height > 115.5,
    );
    await settled(page);
    await undo.evaluate((el: HTMLElement) => el.blur());
    await expect(page.locator("[data-shelf]")).toHaveCount(0, { timeout: 12_000 });
    const edges = await page.evaluate(
      () => (window as unknown as { edges: [number, number][] }).edges,
    );
    // Sinking, when it is alone, is the one time the edge moves; here it always has a bar.
    expect(edges.filter(([up]) => Math.abs(up - 14) > 0.5)).toEqual([]);
    expect(new Set(edges.map(([, height]) => height)).size, "it moved smoothly").toBeGreaterThan(8);
  });
});

test("a slide along the bar and up to Undo does not undo, or open anything", async ({ page }) => {
  const { undo, bar, shelf } = await openShelf(page, "site");
  const tab = (await bar.getByRole("link", { name: "Ask the Word" }).boundingBox())!;
  const target = (await undo.boundingBox())!;
  const before = await page.evaluate(() => history.length);
  await page.mouse.move(tab.x + tab.width / 2, tab.y + tab.height / 2);
  await page.mouse.down();
  // Up to the middle of Undo: further above the bar than a finger may stray and still be on it.
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(shelf).toHaveCount(1);
  await expect(page).toHaveURL(`${CHAT}/privacy`);
  expect(await page.evaluate(() => history.length)).toBe(before);
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
  test(`on a ${size.width} wide tablet the message pill and the shelf match the bar`, async ({
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
    const toast = (await page.locator("[data-shelf]").boundingBox())!;
    const siteBar = (await bar(page).boundingBox())!;
    expect(toast.width).toBeCloseTo(440, 0);
    expect(toast.x).toBeCloseTo(siteBar.x, 0);
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
    // Partway down, the bar is away until the scrolling stops, as a visitor would see.
    await expect(page.locator("html")).not.toHaveAttribute("data-nav-away", "");
    await bar(page).getByRole("link", { name: "Devotional" }).click();
    await expect(page).toHaveURL(`${CHAT}${DEVOTIONAL}`);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => Math.round(scrollY)), `from ${fraction}`).toBeLessThan(5);
  }
});

/** Notes, at every frame, the tabs of each bar on the page and the height of the Undo shelf. */
const watchBars = (page: Page) =>
  page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    const look = () => {
      const bars = [...document.querySelectorAll("nav[data-hides]")].map((nav) =>
        [...nav.querySelectorAll("a, button")].map((tab) => tab.textContent).join("|"),
      );
      const shelf = document.querySelector("[data-shelf]");
      const height = shelf ? ` shelf ${Math.round(shelf.getBoundingClientRect().height)}` : "";
      const now = `${bars.join(" and ") || "NO BAR"}${height}`;
      if (now !== seen.at(-1)) seen.push(now);
      requestAnimationFrame(look);
    };
    look();
  });
const barsSeen = (page: Page) =>
  page.evaluate(() => (window as unknown as { seen: string[] }).seen);

/** A slow connection for the Bible's pages, so any gap on the way there lasts long enough to see. */
const slowBible = (page: Page) =>
  page.route(/localhost:3102\/bible(\/|\?|$)/, async (route) => {
    await new Promise((done) => setTimeout(done, 700));
    await route.continue();
  });

test.describe("into the Bible on a slow connection", () => {
  for (const [from, path, left] of [
    ["the landing page", "/", "Devotional"],
    ["a devotional", "/devotionals/advent-01-more-than-watchmen", "Shore"],
  ] as const) {
    test(`from ${from} the bar stays as it is until the reader's bar replaces it`, async ({
      page,
    }) => {
      await slowBible(page);
      await page.goto(`${CHAT}${path}`);
      await page.waitForLoadState("networkidle");
      await watchBars(page);
      await bar(page).getByRole("link", { name: "Bible" }).click();
      await expect(chapterBar(page)).toBeVisible();
      const seen = await barsSeen(page);
      expect(seen).toHaveLength(2);
      expect(seen[0]).toBe(`${left}|Bible|Ask the Word`);
      expect(seen[1]).toMatch(/Previous chapter.*Shore.*Next chapter/);
    });
  }

  test("from the chat the Undo shelf stays joined all the way", async ({ page }) => {
    await slowBible(page);
    await page.goto(`${CHAT}/privacy`);
    await page.waitForLoadState("networkidle");
    await bar(page).getByText("Ask the Word").click();
    await chatDialog(page).getByRole("textbox", { name: "Your question" }).fill("a draft");
    await watchBars(page);
    await chatDialog(page).getByRole("link", { name: "Bible" }).click();
    await expect(chapterBar(page)).toBeVisible();
    await settled(page);
    // Leaving the chat shows the shelf, which grows to its height. From there to the reader it
    // never shrinks again.
    const heights = (await barsSeen(page))
      .filter((state) => state.includes("shelf"))
      .map((state) => Number(state.split("shelf ")[1]));
    const grown = heights.findIndex((height) => height >= 116);
    expect(grown).toBeGreaterThanOrEqual(0);
    expect(heights.slice(grown).filter((height) => height < 116)).toEqual([]);
  });
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

  /** Turns on one of the settings that call for a solid bar. */
  async function ask(page: Page, setting: "contrast" | "transparency" | "forced colours") {
    if (setting === "contrast") return page.emulateMedia({ contrast: "more" });
    if (setting === "forced colours") return page.emulateMedia({ forcedColors: "active" });
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
  }

  for (const on of ["site", "reader"] as const) {
    test(`with the Undo shelf over the ${on} bar, the one pane is see-through by default`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "pixel-7", "measured in one mobile Chromium");
      const { bar, shelf } = await openShelf(page, on);
      const pane = await look(shelf);
      expect(pane.blur).toContain("blur(18px)");
      expect(pane.alpha).toBeCloseTo(0.72, 2);
      expect(await look(bar)).toEqual({ blur: "none", alpha: 0 });
    });

    for (const setting of ["contrast", "transparency", "forced colours"] as const) {
      test(`with the Undo shelf over the ${on} bar, ${setting} makes the one pane solid`, async ({
        page,
      }, testInfo) => {
        test.skip(
          testInfo.project.name !== "pixel-7" &&
            !(setting === "contrast" && testInfo.project.name === "iphone-13"),
          "Chromium emulates all three; WebKit only increased contrast",
        );
        await ask(page, setting);
        const { bar, shelf } = await openShelf(page, on);
        await expect.poll(() => look(shelf)).toEqual({ blur: "none", alpha: 1 });
        expect(await look(bar), "the bar still draws nothing of its own").toEqual({
          blur: "none",
          alpha: 0,
        });
        // With forced colours emulated, axe also reports the header, hero and footer, with no shelf
        // on the page at all, so there only the shelf and the bar are audited.
        const only = setting === "forced colours" ? ["[data-shelf]", "nav[data-hides]"] : [];
        await noSeriousProblems(page, `shelf, ${setting}`, only);
      });
    }
  }

  test("in forced colours the shelf has a system edge, Undo an outline, and the bar no second edge", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "pixel-7", "measured in one mobile Chromium");
    await ask(page, "forced colours");
    const { bar, shelf, undo } = await openShelf(page, "site");
    /** A system colour as this browser computes it. */
    const system = (name: string) =>
      page.evaluate((colour) => {
        const probe = document.body.appendChild(document.createElement("span"));
        probe.style.color = colour;
        const computed = getComputedStyle(probe).color;
        probe.remove();
        return computed;
      }, name);
    const edge = (target: ReturnType<Page["locator"]>) =>
      target.evaluate((el) => {
        const style = getComputedStyle(el);
        return [parseFloat(style.borderTopWidth), style.borderTopColor] as const;
      });
    expect(await edge(shelf)).toEqual([1, await system("CanvasText")]);
    expect(await edge(undo)).toEqual([2, await system("Highlight")]);
    const [width, colour] = await edge(bar);
    const seen = width > 0 && !/(, 0\)|\/ 0\))$/.test(colour);
    expect(seen, `the bar's own edge: ${width}px ${colour}`).toBe(false);
  });
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

  /**
   * Holds back the timer that brings the bar back when scrolling stops, so that a hidden bar stays
   * hidden while a test looks at it. Otherwise "something else showed it" could pass by waiting.
   */
  const keepAway = (page: Page) =>
    page.addInitScript(() => {
      const later = window.setTimeout.bind(window);
      window.setTimeout = ((run: TimerHandler, ms?: number, ...rest: unknown[]) =>
        ms === 400 ? 0 : later(run, ms, ...rest)) as typeof window.setTimeout;
    });

  async function ready(page: Page, path: string, { returns = false } = {}) {
    if (!returns) await keepAway(page);
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
    test(`${name} leaves on the way down and up, and is there at the top and the end`, async ({
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

      await scroll(page, 500); // on the way up it stays away too
      await expectAway(nav);
      await scroll(page, 0);
      await expectShown(nav);
      await scroll(page, 700);
      await expectAway(nav);

      await scroll(page, 1_000_000);
      await expectShown(nav);
      await scroll(page, (await page.evaluate(() => Math.round(scrollY))) - 300);
      await expectAway(nav); // leaving the end upwards hides it as well
    });
  }

  for (const [name, path, find] of [
    ["the site bar", "/privacy", bar],
    ["the Bible reader's bar", "/bible/web/psalms/119", chapterBar],
  ] as const) {
    test(`${name} comes back when the scrolling stops, and leaves again`, async ({ page }) => {
      await ready(page, path, { returns: true });
      const nav = find(page);
      await scroll(page, 600);
      await expectAway(nav);
      await expectShown(nav); // no more scrolling: it returns by itself
      expect(await page.evaluate(() => Math.round(scrollY))).toBe(600);
      await scroll(page, 700);
      await expectAway(nav);
      await expectShown(nav);
      await scroll(page, 400); // and the same on the way up
      await expectAway(nav);
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

  /** How far the Undo shelf is from the bottom of the screen, and how tall it is. */
  const place = (shelf: ReturnType<Page["locator"]>) =>
    shelf.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return [Math.round(window.innerHeight - box.bottom), Math.round(box.height)];
    });
  const JOINED = [14, 116]; // 52px of shelf over the 64px bar
  const ALONE = [14, 54]; // the shelf by itself, in the bar's place

  /** A line is seen along the shelf's bottom edge only if it has both width and colour. */
  const hairline = (shelf: ReturnType<Page["locator"]>) =>
    shelf.locator("[data-shelf-row]").evaluate((el) => {
      const { borderBottomWidth, borderBottomColor } = getComputedStyle(el);
      return parseFloat(borderBottomWidth) > 0 && borderBottomColor !== "rgba(0, 0, 0, 0)";
    });

  /** What a finger would land on in the middle of it is the thing itself. */
  const reachable = (target: ReturnType<Page["locator"]>) =>
    target.evaluate((el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(x + width / 2, y + height / 2));
    });

  async function expectDraftBack(page: Page) {
    await expect(chatDialog(page).getByRole("textbox", { name: "Your question" })).toHaveValue(
      "a draft",
    );
    await expect(page.locator("[data-shelf]")).toHaveCount(0);
  }

  /** The shelf over a page long enough to scroll. */
  async function openShelfToScroll(page: Page, on: "site" | "reader") {
    const opened = await openShelf(page, on);
    if (on === "reader") {
      // From the chat the reader opens at John 3:16 alone, which has nothing to scroll.
      await opened.bar.getByRole("link", { name: /^Next chapter/ }).click();
      await expect(page).toHaveURL(/\/john\/4/);
      await opened.undo.focus();
    }
    return opened;
  }

  for (const on of ["site", "reader"] as const) {
    test(`with the ${on} bar away the Undo shelf stands alone, whole, and Undo works`, async ({
      page,
    }) => {
      await keepAway(page);
      const { undo, bar, shelf } = await openShelfToScroll(page, on);
      await expect.poll(() => place(shelf)).toEqual(JOINED);
      expect(await hairline(shelf)).toBe(true);

      await scroll(page, 600);
      await expectAway(bar);
      await expect.poll(() => place(shelf)).toEqual(ALONE);
      expect(await hairline(shelf), "no line along its bottom edge").toBe(false);
      expect(await glassOf(shelf), "it keeps its own glass").not.toEqual(NO_GLASS);
      await expect(shelf).toHaveCSS("border-radius", "32px");
      expect(await reachable(undo)).toBe(true);

      await scroll(page, 0); // the top shows the bar
      await expect.poll(() => place(shelf)).toEqual(JOINED);
      await scroll(page, 600);
      await expect.poll(() => place(shelf)).toEqual(ALONE);
      await undo.click();
      await expectDraftBack(page);
    });

    test(`when the scrolling stops the ${on} bar and the Undo shelf join again`, async ({
      page,
    }) => {
      const { bar, shelf } = await openShelfToScroll(page, on);
      await page.waitForLoadState("networkidle");
      await scroll(page, 600);
      await expectAway(bar);
      await expect.poll(() => place(shelf)).toEqual(JOINED); // no more scrolling
      await expectShown(bar);
    });
  }

  test("keyboard focus in the hidden bar brings it back with the shelf joined, and Tab goes on to Undo", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Safari does not Tab to links unless asked to");
    await keepAway(page);
    const { undo, bar, shelf } = await openShelf(page, "site");
    await scroll(page, 600);
    await expect.poll(() => place(shelf)).toEqual(ALONE);
    // Tab on from the last link before the bar, without scrolling to it.
    await page
      .locator("footer a")
      .last()
      .evaluate((el: HTMLElement) => el.focus({ preventScroll: true }));
    await page.keyboard.press("Tab");
    await expect(bar.getByRole("link", { name: "Devotional" })).toBeFocused();
    await expectShown(bar);
    await expect.poll(() => place(shelf)).toEqual(JOINED);
    for (let presses = 0; presses < 3; presses++) await page.keyboard.press("Tab");
    await expect(undo).toBeFocused();
    // Focus has left the bar, so while the page is still scrolled down it goes away again.
    await expect.poll(() => place(shelf)).toEqual(ALONE);
  });

  test("with keyboard focus on Undo, scrolling leaves the shelf alone and Enter still works", async ({
    page,
    browserName,
  }) => {
    await keepAway(page);
    const { undo, bar, shelf } = await openShelf(page, "site");
    await page.keyboard.press("Shift"); // from here on, focus counts as the keyboard's
    await undo.evaluate((el: HTMLElement) => el.blur());
    await undo.focus();
    // Only Chromium counts focus set by a script as the keyboard's after a key press.
    if (browserName === "chromium") {
      expect(await undo.evaluate((el) => el.matches(":focus-visible"))).toBe(true);
    }
    await scroll(page, 600);
    await expectAway(bar);
    await expect.poll(() => place(shelf)).toEqual(ALONE);
    await expect(undo).toBeFocused();
    await page.keyboard.press("Enter");
    await expectDraftBack(page);
  });

  test("on a Bible address that is not found there is no bar, and the shelf stands alone with Undo", async ({
    page,
  }) => {
    await ready(page, "/bible/bsb/john/99");
    await expect(page.locator("nav[data-hides]")).toHaveCount(0);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "Ask the Word" }).click();
    await leaveChatWithDraft(page);
    const shelf = page.locator("[data-shelf]");
    const undo = page.getByRole("button", { name: "Undo" });
    await undo.focus(); // holds the timer
    await settled(page);
    await expect.poll(() => place(shelf)).toEqual(ALONE);
    expect(await hairline(shelf)).toBe(false);
    expect(await glassOf(shelf)).not.toEqual(NO_GLASS);
    expect(await reachable(undo)).toBe(true);
    await noSeriousProblems(page, "shelf alone");
    await undo.click();
    await expectDraftBack(page);
  });

  test("opening the chat from the bar takes the shelf away, and the chat's bar keeps its glass", async ({
    page,
  }) => {
    const { bar, shelf } = await openShelf(page, "site");
    await bar.getByText("Ask the Word").click();
    await expect(chatDialog(page)).toBeVisible();
    await expect(shelf).toHaveCount(0);
    const chatBar = chatDialog(page).getByRole("navigation", { name: "Quick links" });
    expect(await glassOf(chatBar)).not.toEqual(NO_GLASS);
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
    // The mark is only there until the scrolling stops; the poll below sees it straight away.
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await expect(page.locator("html")).toHaveAttribute("data-nav-away", "");
    expect(await chapterBar(page).evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  });
});
