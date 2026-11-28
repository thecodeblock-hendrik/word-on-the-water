import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("next.config images", () => {
  it("serves AVIF first and WebP as the fallback", () => {
    expect(nextConfig.images?.formats).toEqual(["image/avif", "image/webp"]);
  });
});

describe("next.config image cache", () => {
  it("keeps optimized images for a year, because their URLs carry a content hash", () => {
    expect(nextConfig.images?.minimumCacheTTL).toBe(31_536_000);
  });
});

describe("next.config local images", () => {
  it("only lets the optimizer touch content images, without query strings", () => {
    expect(nextConfig.images?.localPatterns).toEqual([{ pathname: "/content/**", search: "" }]);
  });
});

describe("next.config file tracing", () => {
  const articles = ["./content/devotionals/**/*", "./content/series/**/*", "./content/site/**/*"];

  it("ships each route only the content it reads", () => {
    expect(nextConfig.outputFileTracingIncludes).toEqual({
      "/": articles,
      "/devotionals/*": articles,
      "/content/**": articles,
      "/bible/**": ["./content/bibles/**/*"],
      "/videos": ["./content/videos/*.yml"],
      "/videos/advent": ["./content/videos/*.yml"],
    });
  });

  it("keeps the 15 MB of Bible text out of every route except the reader", () => {
    for (const [route, files] of Object.entries(nextConfig.outputFileTracingIncludes ?? {})) {
      const includesBibles = files.some((f) => f.includes("bibles") || f === "./content/**/*");
      expect(includesBibles, route).toBe(route === "/bible/**");
    }
  });
});
