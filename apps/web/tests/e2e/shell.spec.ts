import { expect, test } from "@playwright/test";

test("shell renders with landmarks and no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("primary call to action is a comfortable touch target", async ({ page }) => {
  await page.goto("/");
  const box = await page.getByRole("link", { name: "Get the devotional" }).boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

test("security headers are present and X-Powered-By is not", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("health route is live and uncached", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("unknown route shows the not-found page", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
