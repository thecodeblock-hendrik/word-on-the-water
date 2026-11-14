import { describe, expect, it } from "vitest";

import { resolveSiteUrl } from "@/lib/site";

describe("resolveSiteUrl", () => {
  it("is the production domain by default, and on the production deployment", () => {
    expect(resolveSiteUrl({})).toBe("https://wordonthewater.net");
    expect(
      resolveSiteUrl({ VERCEL_ENV: "production", VERCEL_URL: "wotw-web-abc123.vercel.app" }),
    ).toBe("https://wordonthewater.net");
  });

  it("follows a Vercel preview to its own address, so its absolute links stay on its own origin", () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: "preview",
        VERCEL_URL: "wotw-web-git-x-thecodeblock.vercel.app",
      }),
    ).toBe("https://wotw-web-git-x-thecodeblock.vercel.app");
  });

  it("lets SITE_URL win, with any trailing slash removed", () => {
    expect(resolveSiteUrl({ SITE_URL: "http://localhost:3100/" })).toBe("http://localhost:3100");
    expect(
      resolveSiteUrl({
        SITE_URL: "https://example.test",
        VERCEL_ENV: "preview",
        VERCEL_URL: "x.vercel.app",
      }),
    ).toBe("https://example.test");
  });

  it("ignores a blank SITE_URL and a preview with no address", () => {
    expect(resolveSiteUrl({ SITE_URL: "" })).toBe("https://wordonthewater.net");
    expect(resolveSiteUrl({ VERCEL_ENV: "preview" })).toBe("https://wordonthewater.net");
  });
});
