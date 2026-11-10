import { describe, expect, it } from "vitest";

import { GET } from "@/app/content/[kind]/[slug]/[version]/[file]/route";

const get = (kind: string, slug: string, file: string) =>
  GET(new Request(`http://localhost/content/${kind}/${slug}/abc123/${file}`), {
    params: Promise.resolve({ kind, slug, version: "abc123", file }),
  });

describe("content media route", () => {
  it("serves a verse card as a cacheable PNG", async () => {
    const res = await get(
      "devotionals",
      "advent-01-more-than-watchmen",
      "verse-card-dawn-patrol.png",
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toMatch(/public/);
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });

  it("serves the founder photo as a JPEG", async () => {
    const res = await get("site", "founder", "henno-surfing.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
  });

  it("serves series art", async () => {
    const res = await get("series", "advent", "art-night-swell.png");
    expect(res.status).toBe(200);
  });

  it("serves only the known image files, never the text files", async () => {
    expect((await get("devotionals", "advent-01-more-than-watchmen", "devotional.md")).status).toBe(
      404,
    );
    expect((await get("series", "advent", "series.yml")).status).toBe(404);
  });

  it("rejects unknown kinds, odd slugs and missing files", async () => {
    expect((await get("secrets", "advent", "art-night-swell.png")).status).toBe(404);
    expect((await get("devotionals", "..", "verse-card-dawn-patrol.png")).status).toBe(404);
    expect((await get("devotionals", "nope", "verse-card-dawn-patrol.png")).status).toBe(404);
  });
});

describe("mediaUrl", () => {
  it("puts a content hash in the path so a replaced image gets a new URL", async () => {
    const { mediaUrl } = await import("@/components/devotional/media");
    const url = mediaUrl("series", "advent", "art-night-swell.png");
    expect(url).toMatch(/^\/content\/series\/advent\/[0-9a-f]{8}\/art-night-swell\.png$/);
    expect(mediaUrl("series", "advent", "art-night-swell.png")).toBe(url);
    expect(mediaUrl("series", "advent", "art-dawn-patrol.png")).not.toBe(url);
  });
});
