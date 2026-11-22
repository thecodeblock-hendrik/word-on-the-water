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
