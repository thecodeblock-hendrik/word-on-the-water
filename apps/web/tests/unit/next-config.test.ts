import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("next.config images", () => {
  it("serves AVIF first and WebP as the fallback", () => {
    expect(nextConfig.images?.formats).toEqual(["image/avif", "image/webp"]);
  });
});

describe("next.config local images", () => {
  it("only lets the optimizer touch content images and the writer photo, without query strings", () => {
    expect(nextConfig.images?.localPatterns).toEqual([
      { pathname: "/content/**", search: "" },
      { pathname: "/henno-surfing.jpg", search: "" },
    ]);
  });
});

describe("next.config file tracing", () => {
  it("ships the content folder with the routes that read it, and nothing wider", () => {
    const includes = nextConfig.outputFileTracingIncludes;
    expect(includes).toEqual({
      "/": ["./content/**/*"],
      "/devotionals/*": ["./content/**/*"],
      "/content/**": ["./content/**/*"],
    });
  });
});
