import { describe, expect, it } from "vitest";

import OpenGraphImage, { alt, contentType, size } from "@/app/opengraph-image";

describe("the default social preview image", () => {
  it("is declared 1200 by 630, a PNG, with alt text", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
    expect(alt).toBe("Word on the Water: devotionals and Bible teaching for men and surfers");
  });

  it("renders a real PNG of exactly that size, small enough for every network", async () => {
    const response = await OpenGraphImage();
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await response.arrayBuffer());
    // PNG signature, then the IHDR chunk holds the width and height as big-endian numbers.
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(bytes.buffer);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630]);
    expect(bytes.length).toBeLessThan(1_000_000);
  }, 30_000);
});
