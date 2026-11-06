import { describe, expect, it } from "vitest";

import { GET } from "@/app/content/[kind]/[slug]/[file]/route";

const get = (kind: string, slug: string, file: string) =>
  GET(new Request(`http://localhost/content/${kind}/${slug}/${file}`), {
    params: Promise.resolve({ kind, slug, file }),
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
