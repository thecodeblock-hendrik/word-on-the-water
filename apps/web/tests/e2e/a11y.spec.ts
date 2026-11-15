import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  ["landing page", "/"],
  ["devotional", "/devotionals/advent-01-more-than-watchmen"],
  ["not found", "/no-such-page"],
] as const;

for (const [name, path] of pages) {
  test(`${name} has no serious or critical axe problem, in light and dark`, async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(
        violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id} ${v.nodes[0]?.target}`),
        scheme,
      ).toEqual([]);
    }
  });
}
