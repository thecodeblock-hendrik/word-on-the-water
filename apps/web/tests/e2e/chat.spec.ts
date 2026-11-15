import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { gzipSync } from "node:zlib";

const CHAT = "http://localhost:3102";
const MARKER = "wotw-chat"; // the storage key: only the chat's code contains it

/** Collects CSP violations from the console, to be checked at the end of a journey. */
function watchCsp(page: Page) {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (m.text().includes("Content Security Policy")) violations.push(m.text());
  });
  return violations;
}

async function openChat(page: Page) {
  await page.goto("/#start");
  await page.getByRole("link", { name: "Got Questions" }).click();
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
    await expect(page.getByRole("link", { name: "Got Questions" })).toHaveCount(0);
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
    await expect(page.getByRole("link", { name: "Got Questions" })).toHaveAttribute(
      "href",
      "mailto:hello@wordonthewater.net",
    );
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
    await page.getByRole("link", { name: "Got Questions" }).click();
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
    await page.getByRole("link", { name: "Got Questions" }).click();
    await expect(page.getByText("Short answer 2.1.")).toBeVisible();

    const other = await context.newPage();
    await other.goto("/#start");
    await other.getByRole("link", { name: "Got Questions" }).click();
    await expect(other.getByRole("button", { name: "Who is Jesus?" })).toBeVisible();
    await expect(other.getByText("Short answer 2.1.")).toHaveCount(0);
  });

  test("Escape closes it and focus returns to the button", async ({ page }) => {
    await openChat(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Got Questions" })).toBeFocused();
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
