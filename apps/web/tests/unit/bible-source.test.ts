import { describe, expect, it } from "vitest";

import { getPassage } from "@/lib/bible/get-passage";
import type { Passage } from "@/lib/bible/types";

async function passage(
  version: string,
  book: string,
  chapter: number,
  verses?: string,
): Promise<Passage> {
  const result = await getPassage({ version, book, chapter, verses });
  if (result.status !== "ok") throw new Error(`${version}/${book}/${chapter}: ${result.status}`);
  return result.passage;
}

const shown = (p: Passage) =>
  p.blocks
    .flatMap((b) => ("runs" in b ? b.runs : []))
    .filter((r) => r.start)
    .map((r) => (r.end ? `${r.verse}-${r.end}` : `${r.verse}`));

const textOfVerse = (p: Passage, verse: number) =>
  p.blocks
    .flatMap((b) => ("runs" in b ? b.runs : []))
    .filter((r) => r.verse === verse)
    .map((r) => r.text)
    .join(" ");

describe("getPassage: whole chapters", () => {
  it("reads a BSB chapter from the generated files", async () => {
    const p = await passage("bsb", "john", 3);
    expect(p).toMatchObject({
      version: "bsb",
      book: "john",
      chapter: 3,
      range: null,
      fallback: null,
    });
    expect(p.lastVerse).toBe(36);
    expect(textOfVerse(p, 16)).toBe(
      "For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.",
    );
  });

  it("reads a WEB chapter", async () => {
    const p = await passage("web", "john", 3);
    expect(p.version).toBe("web");
    expect(textOfVerse(p, 16)).toContain("his only born Son");
  });

  it("reads the longest chapter and a single-chapter book", async () => {
    expect((await passage("bsb", "psalms", 119)).lastVerse).toBe(176);
    expect((await passage("web", "jude", 1)).lastVerse).toBe(25);
  });
});

describe("getPassage: verse ranges", () => {
  it("returns only the requested verses", async () => {
    const p = await passage("bsb", "john", 3, "16-18");
    expect(shown(p)).toEqual(["16", "17", "18"]);
    expect(p.range).toEqual({ from: 16, to: 18 });
    expect(p.lastVerse).toBe(36);
  });

  it("returns a single verse", async () => {
    expect(shown(await passage("web", "john", 11, "35"))).toEqual(["35"]);
  });
});

describe("getPassage: verses that differ between versions", () => {
  it("shows Romans 14:24-26 in the WEB", async () => {
    const p = await passage("web", "romans", 14, "24-26");
    expect(shown(p)).toEqual(["24", "25", "26"]);
  });

  it("falls back to the whole BSB chapter for the same range, and says so", async () => {
    const p = await passage("bsb", "romans", 14, "24-26");
    expect(p.range).toBeNull();
    expect(p.fallback).toEqual({ from: 24, to: 26 });
    expect(p.lastVerse).toBe(23);
  });

  it("falls back for a verse the BSB leaves out, and shows what exists around it", async () => {
    const missing = await passage("bsb", "matthew", 17, "21");
    expect(missing.fallback).toEqual({ from: 21, to: 21 });
    const around = await passage("bsb", "matthew", 17, "20-22");
    expect(shown(around)).toEqual(["20", "22"]);
    expect(shown(await passage("web", "matthew", 17, "20-22"))).toEqual(["20", "21", "22"]);
  });
});

describe("getPassage: bad requests", () => {
  it("rejects malformed verses", async () => {
    for (const verses of ["20-10", "abc", "0", "1,2"]) {
      expect(
        await getPassage({ version: "bsb", book: "john", chapter: 3, verses }),
        verses,
      ).toEqual({
        status: "invalid-range",
      });
    }
  });

  it("does not find unknown or disabled versions, unknown books or chapters out of range", async () => {
    const missing = { status: "not-found" };
    expect(await getPassage({ version: "kjv", book: "john", chapter: 3 })).toEqual(missing);
    expect(await getPassage({ version: "esv", book: "john", chapter: 3 })).toEqual(missing);
    expect(await getPassage({ version: "bsb", book: "nobook", chapter: 1 })).toEqual(missing);
    expect(await getPassage({ version: "bsb", book: "john", chapter: 0 })).toEqual(missing);
    expect(await getPassage({ version: "bsb", book: "john", chapter: 22 })).toEqual(missing);
    expect(await getPassage({ version: "bsb", book: "john", chapter: 1.5 })).toEqual(missing);
    expect(await getPassage({ version: "bsb", book: "john", chapter: Number.NaN })).toEqual(
      missing,
    );
  });

  it("cannot be steered outside the data folder", async () => {
    for (const book of ["../../package", "..", "john/../genesis", ""]) {
      expect(await getPassage({ version: "bsb", book, chapter: 1 })).toEqual({
        status: "not-found",
      });
    }
    expect(await getPassage({ version: "../bsb", book: "john", chapter: 1 })).toEqual({
      status: "not-found",
    });
  });
});
