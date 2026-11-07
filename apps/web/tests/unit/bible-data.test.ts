import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { BOOKS, findBook } from "@/lib/bible/books";
import type { ChapterData } from "@/lib/bible/types";
import { verseNumbers } from "@/lib/bible/usfm";

const ROOT = fileURLToPath(new URL("../../content/bibles/", import.meta.url));

const read = (version: string, book: string, chapter: number): ChapterData =>
  JSON.parse(readFileSync(join(ROOT, version, book, `${chapter}.json`), "utf8"));

const textOf = (data: ChapterData, from: number, to = from) =>
  data.blocks
    .flatMap((b) => ("runs" in b ? b.runs : []))
    .filter((r) => r.verse !== null && r.verse >= from && r.verse <= to)
    .map((r) => r.text)
    .join(" ");

describe.each(["bsb", "web"])("generated %s data", (version) => {
  it("has every chapter of all 66 books, numbered from 1", () => {
    expect(existsSync(join(ROOT, version))).toBe(true);
    let total = 0;
    for (const book of BOOKS) {
      const names = readdirSync(join(ROOT, version, book.slug))
        .map((n) => Number(n.replace(".json", "")))
        .sort((a, b) => a - b);
      expect(names, book.name).toEqual(Array.from({ length: book.chapters }, (_, i) => i + 1));
      total += names.length;
    }
    expect(total).toBe(1189);
  });

  it("describes itself correctly and has verses in increasing order with clean text", () => {
    for (const book of BOOKS) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        const data = read(version, book.slug, chapter);
        const where = `${version} ${book.name} ${chapter}`;
        expect(data.version, where).toBe(version);
        expect(data.book, where).toBe(book.slug);
        expect(data.chapter, where).toBe(chapter);

        const numbers = verseNumbers(data);
        expect(numbers.length, where).toBeGreaterThan(0);
        for (const block of data.blocks) {
          const text =
            "runs" in block
              ? block.runs.map((r) => r.text).join(" ")
              : "text" in block
                ? block.text
                : "";
          expect(text, where).not.toMatch(/\\|\|strong|  /);
          if ("runs" in block) for (const run of block.runs) expect(run.text, where).not.toBe("");
        }
      }
    }
  });

  it("renders Psalm 119 with 176 verses and Genesis 1 with 31", () => {
    expect(verseNumbers(read(version, "psalms", 119))).toHaveLength(176);
    expect(verseNumbers(read(version, "genesis", 1))).toHaveLength(31);
  });
});

describe("generated text matches the source exactly", () => {
  it("BSB John 3:16", () => {
    expect(textOf(read("bsb", "john", 3), 16)).toBe(
      "For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.",
    );
  });

  it("WEB John 3:16", () => {
    expect(textOf(read("web", "john", 3), 16)).toBe(
      "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.",
    );
  });

  it("WEB uses LORD for God's name", () => {
    expect(textOf(read("web", "genesis", 2), 4)).toContain("the LORD God made the earth");
  });
});

describe("known differences between the two versions", () => {
  it("has the verses the BSB leaves out in the WEB only", () => {
    expect(verseNumbers(read("web", "matthew", 17))).toContain(21);
    expect(verseNumbers(read("bsb", "matthew", 17))).not.toContain(21);
  });

  it("leaves out WEB verses that are only a footnote", () => {
    expect(verseNumbers(read("web", "luke", 17))).not.toContain(36);
  });

  it("puts the Romans doxology in different places", () => {
    expect(verseNumbers(read("web", "romans", 14)).at(-1)).toBe(26);
    expect(verseNumbers(read("bsb", "romans", 14)).at(-1)).toBe(23);
  });
});

describe.each(["bsb", "web"])("generated %s verse counts", (version) => {
  const counts: number[][] = JSON.parse(readFileSync(join(ROOT, version, "counts.json"), "utf8"));
  const last = (slug: string, chapter: number) =>
    counts[BOOKS.indexOf(findBook(slug)!)][chapter - 1];

  it("has one list per book with one number per chapter", () => {
    expect(counts).toHaveLength(66);
    for (const [i, book] of BOOKS.entries())
      expect(counts[i], book.name).toHaveLength(book.chapters);
  });

  it("agrees with the last verse of every chapter file", () => {
    for (const [i, book] of BOOKS.entries()) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        expect(
          verseNumbers(read(version, book.slug, chapter)).at(-1),
          `${book.name} ${chapter}`,
        ).toBe(counts[i][chapter - 1]);
      }
    }
  });

  it("knows well-known chapters", () => {
    expect(last("john", 3)).toBe(36);
    expect(last("psalms", 119)).toBe(176);
    expect(last("genesis", 1)).toBe(31);
  });
});

describe("verse counts differ where the versions differ", () => {
  it("has the Romans doxology in different places", () => {
    const rom = (v: string) =>
      (JSON.parse(readFileSync(join(ROOT, v, "counts.json"), "utf8")) as number[][])[
        BOOKS.indexOf(findBook("romans")!)
      ];
    expect(rom("web")[13]).toBe(26);
    expect(rom("bsb")[13]).toBe(23);
  });
});
