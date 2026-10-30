import { expect, test } from "@playwright/test";

test("page loads with zero CSP violations and every inline script has the nonce", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(violations).toEqual([]);
  const inlineWithoutNonce = await page.evaluate(
    () => [...document.scripts].filter((script) => !script.src && !script.nonce).length,
  );
  expect(inlineWithoutNonce).toBe(0);
});

test("each request gets a different nonce", async ({ request }) => {
  const nonce = async () => {
    const csp = (await request.get("/")).headers()["content-security-policy"];
    return /'nonce-([^']+)'/.exec(csp)?.[1];
  };
  const [first, second] = [await nonce(), await nonce()];
  expect(first).toBeTruthy();
  expect(first).not.toBe(second);
});

test("the policy forbids unsafe inline and eval scripts", async ({ request }) => {
  const csp = (await request.get("/")).headers()["content-security-policy"];
  const scripts = csp.split(";").find((part) => part.trim().startsWith("script-src")) ?? "";
  expect(scripts).not.toContain("unsafe-inline");
  expect(scripts).not.toContain("unsafe-eval");
});

test("every asset loads over the page's own protocol with no failed requests", async ({ page }) => {
  const failed: string[] = [];
  page.on("requestfailed", (request) => failed.push(request.url()));

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(failed).toEqual([]);
  const ctaMinHeight = await page
    .getByRole("link", { name: "Get the devotional" })
    .evaluate((el) => getComputedStyle(el).minHeight);
  expect(ctaMinHeight).toBe("44px"); // proves the stylesheet was applied
});
