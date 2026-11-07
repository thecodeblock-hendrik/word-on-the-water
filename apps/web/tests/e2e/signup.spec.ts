import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, type Page, test } from "@playwright/test";

const STUB = "http://localhost:3101";
// A form waits for Cloudflare's widget and a few seconds of "human" time; give a busy run room.
const expect = baseExpect.configure({ timeout: 15_000 });
test.describe.configure({ timeout: 60_000 });

/** The form is drawn, and Cloudflare's test widget has issued its token (the CSP lets it load). */
async function readyForm(page: Page) {
  await page.goto("/");
  const band = page.locator("#subscribe");
  await band.scrollIntoViewIfNeeded();
  await expect(band.locator("input[name='cf-turnstile-response']")).not.toHaveValue("", {
    timeout: 20_000,
  });
  return band;
}

async function submit(page: Page, email: string, name = "") {
  const band = await readyForm(page);
  await band.getByLabel("Email").fill(email);
  if (name) await band.getByLabel("First name (optional)").fill(name);
  // The API turns away a form sent within 3 seconds of being drawn; a person is never that fast.
  await page.waitForTimeout(3200);
  await band.getByRole("button", { name: "Subscribe" }).click();
  return band;
}

test.describe("the sign-up form", () => {
  test("is the #subscribe the header button goes to, with large fields", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#subscribe")).toHaveCount(1);
    await page.locator("header a[href='/#subscribe']").click();
    await expect(page).toHaveURL(/#subscribe$/);
    const band = page.locator("#subscribe");
    await expect(band).toBeInViewport();
    for (const control of [
      band.getByLabel("Email"),
      band.getByLabel("First name (optional)"),
      band.getByRole("button", { name: "Subscribe" }),
    ]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
    }
  });

  test("the trap field is never reachable by keyboard or announced", async ({ page }) => {
    await page.goto("/");
    const trap = page.locator("#subscribe input[name='website']");
    await expect(trap).toHaveAttribute("tabindex", "-1");
    expect(await trap.evaluate((el) => el.closest("[aria-hidden='true']") !== null)).toBe(true);
    const box = (await trap.boundingBox())!;
    expect(box.x + box.width).toBeLessThan(0);
  });

  test("loads Cloudflare's widget under the CSP with no violation", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (m.text().includes("Content Security Policy")) violations.push(m.text());
    });
    await readyForm(page);
    expect(violations).toEqual([]);
  });

  test("sends the sign-up to the API and says to check the inbox", async ({ page }) => {
    const band = await submit(page, "reader@example.com", "Ann");

    await expect(band.getByRole("status")).toContainText("Check your inbox");
    await expect(band.getByLabel("Email")).toHaveCount(0);

    const last = await (await fetch(`${STUB}/__last`)).json();
    expect(last.body).toMatchObject({
      email: "reader@example.com",
      first_name: "Ann",
      source: "landing_closing",
      consent_text_version: "v1",
      website: "",
    });
    expect(last.body.turnstile_token).toBeTruthy();
    expect(last.body.rendered_at).toBeLessThan(Date.now() - 3000);
    expect(last.headers.authorization).toMatch(/^Bearer /);
    expect(last.headers["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("explains a bad email next to the field and keeps what was typed", async ({ page }) => {
    const band = await readyForm(page);
    await band.getByLabel("Email").fill("a@b");
    await band.getByLabel("First name (optional)").fill("Ann");
    await band.getByRole("button", { name: "Subscribe" }).click();

    await expect(band.getByText("Enter a valid email address.")).toBeVisible();
    await expect(band.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(band.getByLabel("Email")).toHaveValue("a@b");
    await expect(band.getByLabel("First name (optional)")).toHaveValue("Ann");
  });

  test("tells a visitor over the limit to try again later, without losing the form", async ({
    page,
  }) => {
    const band = await submit(page, "limited@example.com");

    await expect(band.getByRole("alert")).toContainText("Too many sign-ups");
    await expect(band.getByLabel("Email")).toHaveValue("limited@example.com");
  });

  test("asks to try again when the spam check is refused, and the widget is renewed", async ({
    page,
  }) => {
    const band = await submit(page, "refused@example.com");

    await expect(band.getByRole("alert")).toContainText("The check did not pass");
    await expect(band.locator("input[name='cf-turnstile-response']")).not.toHaveValue("", {
      timeout: 20_000,
    });
  });

  test("no sideways scroll and no serious axe problem, in light and dark, with an error shown", async ({
    page,
  }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      const band = page.locator("#subscribe");
      await band.scrollIntoViewIfNeeded();
      await band.getByLabel("Email").fill("a@b");
      await band.getByRole("button", { name: "Subscribe" }).click();
      await expect(band.getByText("Enter a valid email address.")).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(
        violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id} ${v.nodes[0]?.target}`),
        scheme,
      ).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test("is also at the end of a devotional, tagged as coming from there", async ({ page }) => {
    await page.goto("/devotionals/advent-01-more-than-watchmen");
    await expect(page.locator("#subscribe input[name='source']")).toHaveValue("devotional_band");
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("says why signing up needs JavaScript and where to email instead", async ({ page }) => {
      await page.goto("/");
      const message = page.locator("#subscribe noscript p");
      await expect(message).toBeVisible();
      await expect(message).toContainText("Signing up needs JavaScript for the spam check");
      await expect(message).toContainText("hello@wordonthewater.net");
    });
  });
});

test.describe("/thank-you", () => {
  test("is a plain page, kept out of search, with no console CSP errors", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (m.text().includes("Content Security Policy")) violations.push(m.text());
    });
    const response = await page.goto("/thank-you");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "You're in" })).toBeVisible();
    await expect(page.locator("meta[name='robots']")).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await page.getByRole("link", { name: "Read the latest devotional" }).click();
    await expect(page).toHaveURL(/\/devotionals\//);
    expect(violations).toEqual([]);
  });

  test("has no serious axe problem, in light and dark", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/thank-you");
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(
        violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id} ${v.nodes[0]?.target}`),
        scheme,
      ).toEqual([]);
    }
  });
});
