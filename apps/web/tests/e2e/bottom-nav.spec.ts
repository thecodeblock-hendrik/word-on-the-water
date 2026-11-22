import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// The bar needs the Bible reader and the chat both on, which is the second server (port 3102).
const CHAT = "http://localhost:3102";
const labels = ["Devotional", "Bible", "Got Questions"];

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
      for (const label of labels) await expect(bar.getByText(label, { exact: true })).toBeVisible();
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
  await expect(bar.getByRole("link", { name: "Got Questions" })).toBeFocused();
});

test("the chat screen with its bar has no serious axe problem, in light and dark", async ({
  page,
}) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`${CHAT}/`);
    await page.getByRole("navigation", { name: "Quick links" }).getByText("Got Questions").click();
    const dialog = page.getByRole("dialog", { name: "Got Questions" });
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
    await page.getByRole("navigation", { name: "Quick links" }).getByText("Got Questions").click();
    const dialog = page.getByRole("dialog", { name: "Got Questions" });
    await dialog.getByRole("textbox", { name: "Your question" }).fill("a draft");
    await dialog.getByRole("button", { name: "Close" }).click();
    const status = page.getByRole("status");
    await expect(status).toContainText("Chat cleared");
    const undo = status.getByRole("button", { name: "Undo" });
    const toast = (await undo.boundingBox())!;
    const bump = (await page.locator("nav[data-bottom-nav] svg[data-bump]").boundingBox())!;
    expect(toast.y + toast.height).toBeLessThanOrEqual(bump.y);
    expect(toast.height).toBeGreaterThanOrEqual(44);
    // Axe reads colours mid-fade as low contrast, so let the fade-in finish first.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    await noSeriousProblems(page, `toast ${scheme}`);
    await undo.click();
    // Undo reopens the chat, which hides the rest of the page from the accessibility tree.
    await expect(page.getByRole("status", { includeHidden: true })).toBeEmpty();
  }
});

// The latest published devotional on the pinned test day (5 December 2026).
const DEVOTIONAL = "/devotionals/advent-02-the-long-wait";
const bar = (page: Page) => page.getByRole("navigation", { name: "Quick links" });
const chatDialog = (page: Page) => page.getByRole("dialog", { name: "Got Questions" });

async function openChatFromBar(page: Page, path = "/") {
  await page.goto(`${CHAT}${path}`);
  await bar(page).getByText("Got Questions").click();
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
  test("Devotional, Bible and Got Questions on the landing page", async ({ page }) => {
    await page.goto(`${CHAT}/`);
    await bar(page).getByRole("link", { name: "Devotional" }).click();
    await expect(page).toHaveURL(`${CHAT}${DEVOTIONAL}`);
    await expect(bar(page).getByRole("link", { name: "Devotional" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await bar(page).getByRole("link", { name: "Bible" }).click();
    await expect(page).toHaveURL(/\/bible\/[a-z]+\/[a-z0-9-]+\/\d+/);
    await expect(page.getByRole("link", { name: "Shore" })).toBeVisible();

    await page.getByRole("link", { name: "Shore" }).click();
    await expect(page).toHaveURL(`${CHAT}/`);

    await bar(page).getByText("Got Questions").click();
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
    await bar(page).getByText("Got Questions").click();
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
    await bar(page).getByText("Got Questions").click();
    await expect(chatDialog(page).getByText("Short answer 2.1.")).toHaveCount(0);
    await expect(page.getByRole("status", { includeHidden: true })).toBeEmpty();
  });
});
