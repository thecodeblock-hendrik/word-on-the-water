import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { gzipSync } from "node:zlib";

const CHAT = "http://localhost:3102";
const MARKER = '"wotw-chat"'; // the panel's own storage key, quotes included (the return flags share the prefix)

/** Collects CSP violations from the console, to be checked at the end of a journey. */
function watchCsp(page: Page) {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (m.text().includes("Content Security Policy")) violations.push(m.text());
  });
  return violations;
}

const startButton = (page: Page) =>
  page.locator("#start").getByRole("link", { name: "Ask the Word" });

async function openChat(page: Page) {
  await page.goto("/#start");
  await startButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Ask the Word" });
  await expect(dialog).toBeVisible();
  return dialog;
}

const ask = async (page: Page, text: string) => {
  await page.getByRole("textbox", { name: "Your question" }).fill(text);
  await page.keyboard.press("Enter");
};

test.describe("with the chat off (the flag unset)", () => {
  test("the button stays the contact link and no chat code is requested", async ({ page }) => {
    const bodies: string[] = [];
    page.on("response", async (r) => {
      if (r.request().resourceType() === "script") bodies.push(await r.text().catch(() => ""));
    });
    await page.goto("/#start");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "Talk to someone" })).toHaveAttribute(
      "href",
      "mailto:hello@wordonthewater.net",
    );
    await expect(page.getByRole("link", { name: /Ask the Word/ })).toHaveCount(0);
    expect(bodies.filter((b) => b.includes(MARKER))).toEqual([]);
  });
});

test.describe("with the chat on", () => {
  test.use({ baseURL: CHAT });
  test.describe.configure({ timeout: 60_000 });

  test("the button is a mail link without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: CHAT });
    const page = await context.newPage();
    await page.goto("/");
    await expect(startButton(page)).toHaveAttribute("href", "mailto:hello@wordonthewater.net");
    await context.close();
  });

  test("the chat code loads only after the click", async ({ page }) => {
    const chatScripts: string[] = [];
    page.on("response", async (r) => {
      if (
        r.request().resourceType() === "script" &&
        (await r.text().catch(() => "")).includes(MARKER)
      ) {
        chatScripts.push(r.url());
      }
    });
    await page.goto("/#start");
    await page.waitForLoadState("networkidle");
    expect(chatScripts).toEqual([]);
    await startButton(page).click();
    await expect(page.getByRole("dialog", { name: "Ask the Word" })).toBeVisible();
    expect(chatScripts.length).toBeGreaterThan(0);
  });

  test("a conversation: starter, follow-up, more, contested, refusal, crisis, clear", async ({
    page,
  }) => {
    const csp = watchCsp(page);
    const dialog = await openChat(page);
    // A phone does not focus the box (that would open the keyboard); a desktop does.
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await expect(page.getByRole("textbox", { name: "Your question" })).toBeFocused();
    } else {
      await expect(page.getByRole("textbox", { name: "Your question" })).not.toBeFocused();
      await expect(dialog).toBeFocused();
    }

    await dialog.getByRole("button", { name: "Who is Jesus?" }).click();
    await expect(dialog.getByText("Short answer 2.1.")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "John 3:16" })).toHaveAttribute(
      "href",
      "/bible/web/john/3?v=16",
    );

    await dialog.getByRole("button", { name: "What is the gospel?" }).last().click();
    await expect(dialog.getByText("Short answer 3.1.")).toBeVisible();

    await dialog.getByRole("button", { name: "Read more" }).click();
    await expect(dialog.getByText("Long explanation 3.1.")).toBeVisible();

    await ask(page, "should we baptise babies");
    await expect(dialog.getByText("Christians differ on this", { exact: true })).toBeVisible();

    await ask(page, "call me on 082 555 0199");
    await expect(dialog.getByRole("alert")).toContainText("can't take personal details");
    await expect(page.getByRole("textbox", { name: "Your question" })).toHaveValue(
      "call me on 082 555 0199",
    );
    await expect(dialog.getByRole("log").getByText("call me on 082 555 0199")).toHaveCount(0);
    await page.getByRole("textbox", { name: "Your question" }).fill("");

    await ask(page, "I want to end my life");
    await expect(dialog.getByRole("link", { name: "0800 567 567" })).toHaveAttribute(
      "href",
      "tel:0800567567",
    );

    await dialog.getByRole("button", { name: "Clear chat" }).click();
    await expect(dialog.getByRole("button", { name: "Who is Jesus?" })).toBeVisible();
    expect(csp).toEqual([]);
  });

  test("a reload keeps the thread and a new tab does not", async ({ page, context }) => {
    const dialog = await openChat(page);
    await dialog.getByRole("button", { name: "Who is Jesus?" }).click();
    await expect(dialog.getByText("Short answer 2.1.")).toBeVisible();

    await page.reload();
    await startButton(page).click();
    await expect(page.getByText("Short answer 2.1.")).toBeVisible();

    const other = await context.newPage();
    await other.goto("/#start");
    await startButton(other).click();
    await expect(other.getByRole("button", { name: "Who is Jesus?" })).toBeVisible();
    await expect(other.getByText("Short answer 2.1.")).toHaveCount(0);
  });

  test("Escape closes it and focus returns to the button", async ({ page }) => {
    await openChat(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(startButton(page)).toBeFocused();
  });

  test("is also in the menu bar (large screens) or the menu (phones) and opens the same chat", async ({
    page,
  }) => {
    await page.goto("/");
    const wide = page.viewportSize()!.width >= 1024;
    if (wide) {
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Ask the Word" })
        .click();
    } else {
      await page.getByRole("button", { name: "Menu" }).click();
      await page.getByTestId("mobile-menu").getByRole("link", { name: "Ask the Word" }).click();
      await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
    }
    await expect(page.getByRole("dialog", { name: "Ask the Word" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test.describe("coming back from a verse in the Bible", () => {
    async function readVerse(page: Page) {
      const dialog = await openChat(page);
      await dialog.getByRole("button", { name: "Who is Jesus?" }).click();
      await dialog.getByRole("link", { name: "John 3:16" }).click();
      await expect(page).toHaveURL(/\/bible\/web\/john\/3\?v=16/);
    }

    test("a Your chat button appears, stays across chapters, and opens the chat over the page", async ({
      page,
    }) => {
      await readVerse(page);
      const back = page.getByRole("button", { name: "Your chat", exact: true });
      await expect(back).toBeVisible();

      await page.getByRole("link", { name: /Next chapter/ }).click();
      await expect(page).toHaveURL(/\/john\/4/);
      await expect(back).toBeVisible();

      await back.click();
      const dialog = page.getByRole("dialog", { name: "Ask the Word" });
      await expect(dialog).toBeVisible();
      await expect(page).toHaveURL(/\/john\/4/);
      await expect(dialog.getByText("Short answer 2.1.")).toBeVisible();
      await page.goto("/bible/web/john/3");
      await expect(page.getByRole("button", { name: "Your chat", exact: true })).toHaveCount(0);
    });

    test("the browser Back button reopens the chat too", async ({ page }) => {
      await readVerse(page);
      await page.goBack();
      await expect(page.getByRole("dialog", { name: "Ask the Word" })).toBeVisible();
      await page.goForward();
      await expect(page.getByRole("button", { name: "Your chat", exact: true })).toHaveCount(0);
    });

    test("is not there for someone reading the Bible on their own, or in a shared link", async ({
      page,
      browser,
    }) => {
      await page.goto("/bible/web/john/3?v=16");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: "Your chat", exact: true })).toHaveCount(0);

      await readVerse(page);
      const fresh = await (await browser.newContext({ baseURL: CHAT })).newPage();
      await fresh.goto(page.url());
      await expect(fresh.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(fresh.getByRole("button", { name: "Your chat", exact: true })).toHaveCount(0);
    });

    test("on a phone it is the middle tab of the glass bar, between Previous and Next", async ({
      page,
    }) => {
      test.skip(page.viewportSize()!.width >= 1024, "the glass bar is for phones");
      await readVerse(page);
      const button = page.getByRole("button", { name: "Your chat", exact: true });
      await expect(button).toBeVisible();
      const tab = (await button.boundingBox())!;
      const bar = page.getByRole("navigation", { name: "Previous and next chapter" });
      const barBox = (await bar.boundingBox())!;
      const prev = (await bar.getByRole("link", { name: /Previous chapter/ }).boundingBox())!;
      const next = (await bar.getByRole("link", { name: /Next chapter/ }).boundingBox())!;
      for (const [link, text] of [
        [/Previous chapter/, "John 2"],
        [/Next chapter/, "John 4"],
      ] as const) {
        expect(await bar.getByRole("link", { name: link }).locator(".truncate").innerText()).toBe(
          text,
        );
      }
      const width = page.viewportSize()!.width;

      // A 64px capsule with three equal tabs inside it, Your chat centred between the other two.
      expect(barBox.height).toBe(64);
      expect(Math.abs(tab.x + tab.width / 2 - width / 2)).toBeLessThan(4);
      expect(tab.x).toBeGreaterThanOrEqual(prev.x + prev.width);
      expect(tab.x + tab.width).toBeLessThanOrEqual(next.x);
      expect(tab.height).toBeGreaterThanOrEqual(44);
      expect(tab.y).toBeGreaterThanOrEqual(barBox.y);
      expect(tab.y + tab.height).toBeLessThanOrEqual(barBox.y + barBox.height);
      for (const side of [prev, next]) {
        expect(Math.abs(side.width - tab.width)).toBeLessThanOrEqual(1);
      }
      await expect(page.getByRole("button", { name: /Hide the Your chat button/ })).toBeHidden();
    });

    test("at the end of a long chapter the passage credit is clear of the bar", async ({
      page,
    }) => {
      test.skip(page.viewportSize()!.width >= 1024, "the glass bar is for phones");
      await readVerse(page);
      await page.goto("/bible/web/psalms/119");
      // Your chat appears when the page hydrates: scroll only after that.
      await expect(page.getByRole("button", { name: "Your chat", exact: true })).toBeVisible();
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
      );
      const bar = (await page
        .getByRole("navigation", { name: "Previous and next chapter" })
        .boundingBox())!;
      const credit = (await page
        .getByText("World English Bible (WEB), public domain")
        .boundingBox())!;
      expect(credit.y + credit.height).toBeLessThanOrEqual(bar.y);
    });

    test("on a phone the chapter buttons use the short names, with Your chat or Shore between them, and are named for what is shown", async ({
      browser,
    }) => {
      const open = async (chatReturn: boolean) => {
        const context = await browser.newContext({
          baseURL: CHAT,
          viewport: { width: 375, height: 800 },
        });
        if (chatReturn) {
          await context.addInitScript(() => sessionStorage.setItem("wotw-chat-return", "/"));
        }
        const page = await context.newPage();
        await page.goto("/bible/web/matthew/16");
        return page;
      };
      const withChat = await open(true);
      await expect(withChat.locator("[data-chat-return]")).toBeVisible();
      await expect(
        withChat.getByRole("link", { name: "Previous chapter: Matt 15", exact: true }),
      ).toBeVisible();
      await expect(
        withChat.getByRole("link", { name: "Next chapter: Matt 17", exact: true }),
      ).toBeVisible();
      const without = await open(false);
      // Shore takes the same room in the middle, so the short names are used there too.
      await expect(
        without.getByRole("link", { name: "Previous chapter: Matt 15", exact: true }),
      ).toBeVisible();
      await expect(without.getByRole("link", { name: "Shore" })).toBeVisible();
      await expect(without.locator("[data-chat-return]")).toHaveCount(0);
    });

    for (const scheme of ["light", "dark"] as const) {
      test(`the Bible reader with the Your chat tab showing has no serious accessibility problem in ${scheme}`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await readVerse(page);
        await expect(page.getByRole("button", { name: "Your chat", exact: true })).toBeVisible();
        const scan = await new AxeBuilder({ page }).analyze();
        expect(
          scan.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
        ).toEqual([]);
      });
    }

    for (const width of [320, 360, 375, 390]) {
      test(`with Your chat showing, the chapter buttons keep book and number on one line at ${width}px`, async ({
        browser,
      }) => {
        const context = await browser.newContext({
          baseURL: CHAT,
          viewport: { width, height: 800 },
        });
        await context.addInitScript(() => sessionStorage.setItem("wotw-chat-return", "/"));
        const page = await context.newPage();
        for (const path of [
          "/bible/bsb/song-of-solomon/7",
          "/bible/bsb/2-thessalonians/2",
          "/bible/bsb/1-corinthians/15",
        ]) {
          await page.goto(path);
          await expect(page.locator("[data-chat-return]")).toBeVisible();
          const nav = page.getByRole("navigation", { name: "Previous and next chapter" });
          for (const link of await nav.getByRole("link").all()) {
            const label = `${path}: ${await link.innerText()}`;
            expect((await link.boundingBox())!.height, label).toBeLessThanOrEqual(54);
            expect(
              (await link.locator(".truncate").boundingBox())!.height,
              label,
            ).toBeLessThanOrEqual(20);
            expect(await link.evaluate((el) => el.scrollWidth <= el.clientWidth), label).toBe(true);
            await expect(link.locator("svg"), label).toBeVisible();
            // The chat button is in the bar, so the names are the standard short forms, and they show.
            const shown = await link.locator(".truncate").innerText();
            expect(shown, label).toMatch(/^(\d )?[A-Z][A-Za-z]+ \d+$/);
            expect(shown, label).not.toMatch(/Solomon|Thessalonians|Corinthians|Deuteronomy/);
            // The whole name is shown: the part that can truncate is not truncated.
            expect(
              await link.locator(".truncate").evaluate((el) => el.scrollWidth <= el.clientWidth),
              `${label}: the name is cut off`,
            ).toBe(true);
          }
        }
        await context.close();
      });
    }

    test("on a wide screen it is a tab on the right edge, mid-height, and can be hidden", async ({
      page,
    }) => {
      test.skip(page.viewportSize()!.width < 1024, "the edge tab is for wide screens");
      await readVerse(page);
      const { width, height } = page.viewportSize()!;
      const back = page.getByRole("button", { name: "Your chat", exact: true });
      const box = (await back.boundingBox())!;
      expect(Math.round(box.x + box.width)).toBe(width);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(Math.abs(box.y + box.height / 2 - height / 2)).toBeLessThan(height / 4);
      const hide = page.getByRole("button", { name: /Hide the Your chat button/ });
      expect((await hide.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await hide.click();
      await expect(back).toHaveCount(0);
    });
  });

  test("the menu bar keeps every link on one line with no sideways scroll", async ({ page }) => {
    test.skip(page.viewportSize()!.width < 1024, "the bar is shown from lg");
    await page.goto("/");
    const links = page.getByRole("navigation", { name: "Main" }).getByRole("link");
    for (const link of await links.all()) {
      expect((await link.boundingBox())!.height).toBeLessThanOrEqual(48);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test("the Start here button is solid, labelled with a question and 44px tall or more", async ({
    page,
  }) => {
    await page.goto("/#start");
    const button = startButton(page);
    await expect(button).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      "rgba(0, 0, 0, 0)",
    );
  });

  test("fits the screen, has 44px targets and no serious axe problem, in both schemes", async ({
    page,
  }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      const dialog = await openChat(page);
      await dialog.getByRole("button", { name: "Who is Jesus?" }).click();
      await expect(dialog.getByText("Short answer 2.1.")).toBeVisible();

      const box = (await dialog.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 0.5);
      for (const chip of await dialog.getByRole("button").all()) {
        expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
      }

      const answerScan = await new AxeBuilder({ page }).analyze();
      await ask(page, "I want to end my life");
      await expect(dialog.getByRole("link", { name: "0800 567 567" })).toBeVisible();
      const crisisScan = await new AxeBuilder({ page }).analyze();
      for (const { violations } of [answerScan, crisisScan]) {
        expect(
          violations
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map((v) => `${v.id} ${v.nodes[0]?.target}`),
          scheme,
        ).toEqual([]);
      }
      await page.evaluate(() => sessionStorage.clear());
      await page.goto("about:blank");
    }
  });
});

test.describe("landing page JavaScript", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "measured once, in Chromium");

  // The landing page already ships about 157 KB gzipped (Next and React), above the old 100 KB
  // target; ADR 0010 sets the budget at 165 KB. This ceiling enforces it and stops the chat adding to it:
  // its panel is a separate chunk (see "the chat code loads only after the click").
  const CEILING = 165 * 1024;

  for (const [name, base] of [
    ["off", undefined],
    ["on", CHAT],
  ] as const) {
    test(`does not grow past today's size with the chat ${name}`, async ({ page }) => {
      let bytes = 0;
      page.on("response", async (r) => {
        if (r.request().resourceType() !== "script") return;
        const body = await r.body().catch(() => null);
        if (body) bytes += gzipSync(body).length;
      });
      await page.goto(`${base ?? ""}/`);
      await page.waitForLoadState("networkidle");
      expect(bytes).toBeLessThan(CEILING);
    });
  }
});
