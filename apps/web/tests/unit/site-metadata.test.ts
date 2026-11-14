import { describe, expect, it } from "vitest";

import { generateMetadata as devotionalMetadata } from "@/app/devotionals/[slug]/page";
import { metadata as homeMetadata } from "@/app/page";
import { siteMetadata } from "@/lib/seo";

describe("the site-wide metadata", () => {
  it("resolves every relative address against the production domain", () => {
    expect(String(siteMetadata.metadataBase)).toBe("https://wordonthewater.net/");
  });

  it("names the site and titles each page with it", () => {
    expect(siteMetadata.title).toEqual({
      default: "Word on the Water",
      template: "%s | Word on the Water",
    });
    expect(siteMetadata.description).toBe("Devotionals and Bible teaching for men and surfers.");
    expect(siteMetadata.applicationName).toBe("Word on the Water");
  });

  it("describes the site to Facebook, WhatsApp and the like, and asks Twitter for a large image", () => {
    expect(siteMetadata.openGraph).toMatchObject({
      type: "website",
      siteName: "Word on the Water",
      locale: "en_GB",
    });
    expect(siteMetadata.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("page metadata", () => {
  it("the home page is its own canonical address", () => {
    expect(homeMetadata.alternates?.canonical).toBe("/");
  });

  it("a devotional keeps its canonical address and its verse card, and carries the site name", async () => {
    const meta = await devotionalMetadata({
      params: Promise.resolve({ slug: "advent-01-more-than-watchmen" }),
    });
    expect(meta.alternates?.canonical).toBe("/devotionals/advent-01-more-than-watchmen");
    expect(meta.openGraph).toMatchObject({
      type: "article",
      siteName: "Word on the Water",
      locale: "en_GB",
    });
    const image = (meta.openGraph?.images as { url: string }[])[0];
    expect(image.url).toMatch(
      /^\/content\/devotionals\/advent-01-more-than-watchmen\/[0-9a-f]{8}\/verse-card-night-swell\.png$/,
    );
  });
});
