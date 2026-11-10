import { describe, expect, it } from "vitest";

import { contentVersion } from "@/components/devotional/media";
import { GET } from "@/app/content/[kind]/[slug]/[version]/[file]/route";

const get = (kind: string, slug: string, file: string, version?: string) => {
  const v = version ?? safeVersion(kind, slug, file);
  return GET(new Request(`http://localhost/content/${kind}/${slug}/${v}/${file}`), {
    params: Promise.resolve({ kind, slug, version: v, file }),
  });
};

/** The real hash when the file exists, so the 404 cases test the name checks and not the version. */
function safeVersion(kind: string, slug: string, file: string): string {
  try {
    return contentVersion(kind as "series", slug, file);
  } catch {
    return "00000000";
  }
}

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

  it("rejects a version that is not the file's current hash, so URLs cannot be made up", async () => {
    const file = "art-night-swell.png";
    expect((await get("series", "advent", file, "deadbeef")).status).toBe(404);
    expect(
      (await get("series", "advent", file, contentVersion("series", "advent", file))).status,
    ).toBe(200);
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
