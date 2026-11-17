import { existsSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import manifest from "@/app/manifest";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { THEME_COLORS } from "@/lib/theme";

const web = join(__dirname, "../..");
const m = manifest();

describe("web app manifest", () => {
  it("names the app and gives the short name shown under the home screen icon", () => {
    expect(m.name).toBe(SITE_NAME);
    expect(m.short_name).toBe("WotW");
    expect(m.description).toBe(SITE_DESCRIPTION);
    expect(m.lang).toBe("en");
  });

  it("starts at the home page and covers the whole site", () => {
    expect([m.id, m.start_url, m.scope]).toEqual(["/", "/", "/"]);
  });

  it("opens full screen and does not lock the orientation (WCAG 1.3.4)", () => {
    expect(m.display).toBe("standalone");
    expect(m).not.toHaveProperty("orientation");
  });

  it("takes its colours from the theme, so there is one source", () => {
    expect(m.theme_color).toBe(THEME_COLORS.dark);
    expect(m.background_color).toBe(THEME_COLORS.dark);
  });

  it("lists a 192 and a 512 icon for any use and a 512 maskable icon", () => {
    const icons = m.icons ?? [];
    const has = (sizes: string, purpose: string) =>
      icons.some((i) => i.sizes === sizes && i.purpose === purpose);
    expect(has("192x192", "any")).toBe(true);
    expect(has("512x512", "any")).toBe(true);
    expect(has("512x512", "maskable")).toBe(true);
  });

  it("only lists icons that exist, with the size and type it claims", async () => {
    for (const icon of m.icons ?? []) {
      const file = join(web, "public", icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const meta = await sharp(file).metadata();
      expect(`${meta.width}x${meta.height}`, icon.src).toBe(icon.sizes);
      expect(icon.type).toBe("image/png");
    }
  });

  it("does not combine any and maskable in one icon, which crops the logo on some phones", () => {
    for (const icon of m.icons ?? []) expect(icon.purpose).not.toContain(" ");
  });
});

describe("manifest shortcuts", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("offers Start here, and Bible only while the reader is on", () => {
    vi.stubEnv("BIBLE_ENABLED", "");
    expect(manifest().shortcuts?.map((s) => s.url)).toEqual(["/#start"]);
    vi.stubEnv("BIBLE_ENABLED", "1");
    expect(manifest().shortcuts?.map((s) => s.url)).toEqual(["/#start", "/bible"]);
  });

  it("keeps every shortcut inside the scope, with a short name and an icon that exists", async () => {
    vi.stubEnv("BIBLE_ENABLED", "1");
    for (const shortcut of manifest().shortcuts ?? []) {
      expect(shortcut.url.startsWith(m.scope ?? "/")).toBe(true);
      expect(shortcut.short_name?.length ?? 99).toBeLessThanOrEqual(12);
      for (const icon of shortcut.icons ?? []) {
        const meta = await sharp(join(web, "public", icon.src)).metadata();
        expect(`${meta.width}x${meta.height}`, icon.src).toBe(icon.sizes);
      }
    }
  });
});

describe("manifest screenshots", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("shows the landing page and a devotional, and the Bible reader while it is on", () => {
    vi.stubEnv("BIBLE_ENABLED", "");
    expect(manifest().screenshots?.map((s) => s.label)).toEqual([
      "The landing page",
      "A devotional",
    ]);
    vi.stubEnv("BIBLE_ENABLED", "1");
    expect(manifest().screenshots?.map((s) => s.label)).toContain("The Bible reader");
  });

  it("describes each image truthfully: narrow, PNG, and the size the file really has", async () => {
    vi.stubEnv("BIBLE_ENABLED", "1");
    for (const shot of manifest().screenshots ?? []) {
      expect(shot.form_factor).toBe("narrow");
      expect(shot.type).toBe("image/png");
      const meta = await sharp(join(web, "public", shot.src)).metadata();
      expect(`${meta.width}x${meta.height}`, shot.src).toBe(shot.sizes);
    }
  });
});
