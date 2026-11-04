import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("next.config images", () => {
  it("serves AVIF first and WebP as the fallback", () => {
    expect(nextConfig.images?.formats).toEqual(["image/avif", "image/webp"]);
  });
});
