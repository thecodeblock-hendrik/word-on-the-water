import { readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { THEME_COLORS } from "@/lib/theme";

const root = join(__dirname, "../..");
const PNGS = [
  { file: "public/icons/icon-96.png", size: 96 },
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "public/icons/icon-maskable-512.png", size: 512 },
  { file: "src/app/apple-icon.png", size: 180 },
];

describe("app icons", () => {
  it.each(PNGS)("$file is a $size px square PNG with no transparency", async ({ file, size }) => {
    const meta = await sharp(join(root, file)).metadata();
    expect(meta.format).toBe("png");
    expect([meta.width, meta.height]).toEqual([size, size]);
    // iOS paints transparent areas black, and a maskable icon needs a full-bleed background.
    expect(meta.hasAlpha ? (await sharp(join(root, file)).stats()).isOpaque : true).toBe(true);
  });

  it("keeps the logo inside the maskable safe zone: the corners are plain background", async () => {
    const { data, info } = await sharp(join(root, "public/icons/icon-maskable-512.png"))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const bg = THEME_COLORS.dark
      .slice(1)
      .match(/../g)!
      .map((h) => parseInt(h, 16));
    const margin = Math.round(info.width * 0.1);
    for (const [x, y] of [
      [0, 0],
      [info.width - 1, 0],
      [0, info.height - 1],
      [info.width - 1, info.height - 1],
      [margin, margin],
    ]) {
      const i = (y * info.width + x) * info.channels;
      expect([data[i], data[i + 1], data[i + 2]]).toEqual(bg);
    }
  });
});

describe("icon.svg", () => {
  const svg = readFileSync(join(root, "src/app/icon.svg"), "utf8");

  it("has fixed colours, because an image file has no CSS variables", () => {
    expect(svg).not.toMatch(/var\(|class=/);
  });

  it("uses the Night swell background from the theme", () => {
    expect(svg).toContain(`fill="${THEME_COLORS.dark}"`);
  });
});
