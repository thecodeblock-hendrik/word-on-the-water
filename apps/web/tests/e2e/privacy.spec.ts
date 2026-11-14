import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("/privacy", () => {
  test("is reached from the footer of every page, may be indexed, and has no CSP errors", async ({
    page,
  }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (m.text().includes("Content Security Policy")) violations.push(m.text());
    });
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Privacy policy" }).click();

    await expect(page).toHaveURL("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(9);
    await expect(page.locator("meta[name='robots']")).toHaveCount(0);
    expect(violations).toEqual([]);
  });

  test("does not scroll sideways and keeps the footer link at least 44px high", async ({
    page,
  }) => {
    await page.goto("/privacy");
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(sideways).toBe(false);
    const link = page.getByRole("contentinfo").getByRole("link", { name: "Privacy policy" });
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("has no serious axe problem, in light and dark", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/privacy");
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
