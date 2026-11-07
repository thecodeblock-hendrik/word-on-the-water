import { describe, expect, it } from "vitest";

import { selectVerses } from "@/lib/bible/passage";
import type { Block, ChapterData, Run } from "@/lib/bible/types";

const run = (verse: number | null, text: string, start = true, end: number | null = null): Run => ({
  verse,
  end,
  start,
  text,
});

const chapter = (blocks: Block[]): ChapterData => ({
  version: "bsb",
  book: "john",
  chapter: 3,
  blocks,
});

const para = (...runs: Run[]): Block => ({ kind: "paragraph", indent: 0, runs });

/** Verses 1 to 6 across blocks, with a heading before verse 4 and a break between stanzas. */
const SAMPLE = chapter([
  { kind: "heading", level: 2, text: "First heading" },
  para(run(1, "One."), run(2, "Two begins")),
  para(run(2, "and ends.", false), run(3, "Three.")),
  { kind: "break" },
  { kind: "heading", level: 2, text: "Second heading" },
  { kind: "poetry", indent: 1, runs: [run(4, "Four,")] },
  { kind: "poetry", indent: 2, runs: [run(4, "still four.", false), run(5, "Five.")] },
  { kind: "break" },
  para(run(6, "Six.")),
]);

const verses = (blocks: Block[]) =>
  blocks.flatMap((b) => ("runs" in b ? b.runs.map((r) => `${r.verse}:${r.text}`) : []));

describe("selectVerses: whole chapter", () => {
  it("returns every block and the last verse when no verses are asked for", () => {
    const result = selectVerses(SAMPLE);
    expect(result).not.toBe("invalid-range");
    if (result === "invalid-range") return;
    expect(result.blocks).toEqual(SAMPLE.blocks);
    expect(result.range).toBeNull();
    expect(result.fallback).toBeNull();
    expect(result.lastVerse).toBe(6);
    expect(result).toMatchObject({ version: "bsb", book: "john", chapter: 3 });
  });
});

describe("selectVerses: verse ranges", () => {
  const pick = (input: string) => {
    const result = selectVerses(SAMPLE, input);
    if (result === "invalid-range") throw new Error("invalid");
    return result;
  };

  it("returns a single verse", () => {
    const result = pick("5");
    expect(verses(result.blocks)).toEqual(["5:Five."]);
    expect(result.range).toEqual({ from: 5, to: 5 });
    expect(result.fallback).toBeNull();
  });

  it("returns a range across blocks, including the continuation of a verse", () => {
    expect(verses(pick("2-4").blocks)).toEqual([
      "2:Two begins",
      "2:and ends.",
      "3:Three.",
      "4:Four,",
      "4:still four.",
    ]);
  });

  it("keeps the last verse of the whole chapter, not of the range", () => {
    expect(pick("2-3").lastVerse).toBe(6);
  });

  it("keeps a heading when the block it introduces starts inside the range", () => {
    const kinds = pick("4-5").blocks.map((b) => b.kind);
    expect(kinds).toEqual(["heading", "poetry", "poetry"]);
  });

  it("drops a heading when its block starts before the range", () => {
    expect(pick("2").blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph"]);
  });

  it("drops breaks at the start and end but keeps one between kept blocks", () => {
    expect(pick("3-6").blocks.map((b) => b.kind)).toEqual([
      "paragraph",
      "break",
      "heading",
      "poetry",
      "poetry",
      "break",
      "paragraph",
    ]);
    expect(pick("4-5").blocks[0].kind).toBe("heading");
    expect(pick("4-5").blocks.at(-1)?.kind).toBe("poetry");
  });

  it("clamps a range that runs past the end of the chapter", () => {
    const result = pick("5-40");
    expect(verses(result.blocks)).toEqual(["5:Five.", "6:Six."]);
    expect(result.range).toEqual({ from: 5, to: 6 });
    expect(result.fallback).toBeNull();
  });

  it("finds a verse inside a combined label such as 3-4", () => {
    const joined = chapter([
      para(run(1, "One."), run(3, "Three and four.", true, 4), run(5, "Five.")),
    ]);
    const result = selectVerses(joined, "4");
    if (result === "invalid-range") throw new Error("invalid");
    expect(verses(result.blocks)).toEqual(["3:Three and four."]);
  });

  it("shows the verses that exist when some in the range are missing", () => {
    const gappy = chapter([para(run(20, "Twenty."), run(22, "Twenty-two."))]);
    const result = selectVerses(gappy, "20-22");
    if (result === "invalid-range") throw new Error("invalid");
    expect(verses(result.blocks)).toEqual(["20:Twenty.", "22:Twenty-two."]);
    expect(result.range).toEqual({ from: 20, to: 22 });
  });
});

describe("selectVerses: verses this version does not have", () => {
  it("falls back to the whole chapter and says which verses were asked for", () => {
    for (const input of ["7", "7-9", "99"]) {
      const result = selectVerses(SAMPLE, input);
      if (result === "invalid-range") throw new Error("invalid");
      expect(result.blocks, input).toEqual(SAMPLE.blocks);
      expect(result.range, input).toBeNull();
      expect(result.fallback, input).toEqual({
        from: Number(input.split("-")[0]),
        to: Number(input.split("-").at(-1)),
      });
    }
  });

  it("falls back when the only requested verse is skipped in this version", () => {
    const gappy = chapter([para(run(20, "Twenty."), run(22, "Twenty-two."))]);
    const result = selectVerses(gappy, "21");
    if (result === "invalid-range") throw new Error("invalid");
    expect(result.range).toBeNull();
    expect(result.fallback).toEqual({ from: 21, to: 21 });
    expect(verses(result.blocks)).toHaveLength(2);
  });
});

describe("selectVerses: malformed input", () => {
  it("rejects zero, reversed, lists, words, blanks and over-long numbers", () => {
    for (const bad of [
      "0",
      "0-3",
      "5-3",
      "1,3",
      "abc",
      "",
      " 3",
      "3 ",
      "1-2-3",
      "1000",
      "-4",
      "4-",
    ]) {
      expect(selectVerses(SAMPLE, bad), JSON.stringify(bad)).toBe("invalid-range");
    }
  });
});
