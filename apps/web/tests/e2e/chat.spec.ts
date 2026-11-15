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
  page.locator("#start").getByRole("link", { name: "Got Questions?" });

async function openChat(page: Page) {
  await page.goto("/#start");
  await startButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Got Questions" });
  await expect(dialog).toBeVisible();
  return dialog;
}

const ask = async (page: Page, text: string) => {
  await page.getByRole("textbox", { name: "Your question" }).fill(text);
  await page.keyboard.press("Enter");
};

test.describe("with the chat off (like Production)", () => {
  test("the button stays the contact link and no chat code is requested", async ({ page }) => {
    const bodies: string[] = [];
    page.on("response", async (r) => {
      if (r.request().resourceType() === "script") bodies.push(await r.text().catch(() => ""));
    });
    await page.goto("/#start");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "Talk to someone" })).toHaveAttribute(
      "href",
      "/#contact",
    );
    await expect(page.getByRole("link", { name: /Got Questions/ })).toHaveCount(0);
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
    await expect(page.getByRole("dialog", { name: "Got Questions" })).toBeVisible();
    expect(chatScripts.length).toBeGreaterThan(0);
  });

  test("a conversation: starter, follow-up, more, contested, refusal, crisis, clear", async ({
    page,
  }) => {
    const csp = watchCsp(page);
    const dialog = await openChat(page);
    await expect(page.getByRole("textbox", { name: "Your question" })).toBeFocused();

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
        .getByRole("link", { name: "Got Questions" })
        .click();
    } else {
      await page.getByRole("button", { name: "Menu" }).click();
      await page.getByTestId("mobile-menu").getByRole("link", { name: "Got Questions" }).click();
      await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
    }
    await expect(page.getByRole("dialog", { name: "Got Questions" })).toBeVisible();
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
      const dialog = page.getByRole("dialog", { name: "Got Questions" });
      await expect(dialog).toBeVisible();
      await expect(page).toHaveURL(/\/john\/4/);
      await expect(dialog.getByText("Short answer 2.1.")).toBeVisible();
      await page.goto("/bible/web/john/3");
      await expect(page.getByRole("button", { name: "Your chat", exact: true })).toHaveCount(0);
    });

    test("the browser Back button reopens the chat too", async ({ page }) => {
      await readVerse(page);
      await page.goBack();
      await expect(page.getByRole("dialog", { name: "Got Questions" })).toBeVisible();
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

    test("on a phone it is a round button between Previous and Next, not covering either", async ({
      page,
    }) => {
      test.skip(page.viewportSize()!.width >= 1024, "the round button is for phones");
      await readVerse(page);
      const bar = page.getByRole("navigation", { name: "Previous and next chapter" });
      const round = (await page
        .getByRole("button", { name: "Your chat", exact: true })
        .boundingBox())!;
      const prev = (await bar.getByRole("link", { name: /Previous chapter/ }).boundingBox())!;
      const next = (await bar.getByRole("link", { name: /Next chapter/ }).boundingBox())!;
      expect(prev.x + prev.width).toBeLessThanOrEqual(round.x);
      expect(round.x + round.width).toBeLessThanOrEqual(next.x);
      // Centred in the bar, rising above it, and 44px or more to tap.
      const width = page.viewportSize()!.width;
      expect(Math.abs(round.x + round.width / 2 - width / 2)).toBeLessThan(8);
      const barBox = (await bar.boundingBox())!;
      expect(round.y).toBeLessThan(barBox.y);
      expect(round.width).toBeGreaterThanOrEqual(44);
      await expect(page.getByRole("button", { name: /Hide the Your chat button/ })).toBeHidden();
    });

    test("at the end of a long chapter its words and the passage credit do not overlap", async ({
      page,
    }) => {
      test.skip(page.viewportSize()!.width >= 1024, "the round button is for phones");
      await readVerse(page);
      await page.goto("/bible/web/psalms/119");
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(300);
      const round = (await page
        .getByRole("button", { name: "Your chat", exact: true })
        .boundingBox())!;
      const credit = (await page
        .getByText("World English Bible (WEB), public domain")
        .boundingBox())!;
      expect(credit.y + credit.height).toBeLessThanOrEqual(round.y + 1);
    });

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

  // The landing page already ships about 157 KB gzipped (Next and React), over the 100 KB target in
  // CLAUDE.md; Lighthouse CI (step 1.8) owns that budget. This ceiling stops the chat adding to it:
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
