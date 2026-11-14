import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt =
  "Word on the Water: devotionals and Bible teaching for surfers and anyone who feels the swell of life";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Night swell (tokens.css) as hex: an image has no CSS variables.
const BG = "#0f2233";
const INK = "#f4f1ea";
const MUTED = "#a9b7c2";
const ACCENT = "#6fc0bc";

/**
 * The default social preview, for the home page and any page without its own image (a devotional
 * uses its verse card). Built once at build time: it reads no request data.
 */
export default async function OpenGraphImage() {
  const picture = await readFile(join(process.cwd(), "content/site/social/og-background.jpg"));
  const src = `data:image/jpeg;base64,${picture.toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        background: BG,
        color: INK,
      }}
    >
      <img
        src={src}
        width={size.width}
        height={size.height}
        alt=""
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `linear-gradient(90deg, ${BG}f5 0%, ${BG}d9 38%, ${BG}00 68%)`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 80px",
          width: 760,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: ACCENT,
          }}
        >
          Devotionals and Bible teaching
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 100,
            fontWeight: 800,
            lineHeight: 1.02,
            textTransform: "uppercase",
          }}
        >
          Word on the Water
        </div>
        <div style={{ display: "flex", marginTop: 30, fontSize: 36, color: MUTED }}>
          For surfers and anyone who feels the swell of life
        </div>
      </div>
    </div>,
    { ...size },
  );
}
