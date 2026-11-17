import { statSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { loadSeries } from "@/lib/devotionals/series-load";

const dir = join(__dirname, "../../public/email");

describe("series email banners", () => {
  const withBanner = loadSeries().filter((s) => s.emailBanner);

  it("has at least one, so this suite is not empty", () => {
    expect(withBanner.length).toBeGreaterThan(0);
  });

  it.each(withBanner.map((s) => [s.slug, s.emailBanner!]))(
    "%s: %s exists in public/email, is a 1200 px wide JPEG and under 100 KB",
    async (_slug, file) => {
      const path = join(dir, file);
      expect(statSync(path).size).toBeLessThan(100 * 1024);
      const meta = await sharp(path).metadata();
      expect(meta.format).toBe("jpeg");
      expect(meta.width).toBe(1200);
    },
  );
});
