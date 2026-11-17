import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { THEME_COLORS } from "../src/lib/theme.ts";

/**
 * Builds every app icon from src/app/icon.svg (the logo with fixed colours): run with
 * `pnpm make:icons` after the logo changes, and commit the PNGs.
 */
const root = join(import.meta.dirname, "..");
const master = await readFile(join(root, "src/app/icon.svg"), "utf8");
const mark = master.match(/<g id="mark">[\s\S]*<\/g>(?=\s*<\/svg>)/)?.[0];
if (!mark) throw new Error('icon.svg has no <g id="mark"> group');

// The mark's bounding box is about 14..181 by 19..192. Scaled to 66% it sits inside the circle
// (40% of the icon's width) that a maskable icon is guaranteed to keep when a phone crops it.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<rect width="200" height="200" fill="${THEME_COLORS.dark}"/>
<g transform="translate(100 100) scale(0.66) translate(-97.5 -105.5)">${mark}</g>
</svg>`;

const outputs = [
  { svg: master, size: 96, file: "public/icons/icon-96.png" },
  { svg: master, size: 192, file: "public/icons/icon-192.png" },
  { svg: master, size: 512, file: "public/icons/icon-512.png" },
  { svg: maskable, size: 512, file: "public/icons/icon-maskable-512.png" },
  { svg: master, size: 180, file: "src/app/apple-icon.png" },
];

for (const { svg, size, file } of outputs) {
  const png = await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .flatten({ background: THEME_COLORS.dark })
    .png()
    .toBuffer();
  await writeFile(join(root, file), png);
  console.log(`${file} ${size}px`);
}
