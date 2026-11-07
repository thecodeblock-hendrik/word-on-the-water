import { describe, expect, it } from "vitest";

import { BOOKS, findBook } from "@/lib/bible/books";
import { findBookFile, importBook, importVersion } from "@/lib/bible/import";
import { USFM_CODES } from "@/lib/bible/usfm-codes";

describe("USFM_CODES", () => {
  it("has one unique code per book, in the same order as BOOKS", () => {
    expect(USFM_CODES).toHaveLength(66);
    expect(new Set(USFM_CODES).size).toBe(66);
  });

  it("lines up with the book table", () => {
    const slugOf = (code: string) => BOOKS[USFM_CODES.indexOf(code)].slug;
    expect(slugOf("GEN")).toBe("genesis");
    expect(slugOf("PSA")).toBe("psalms");
    expect(slugOf("SNG")).toBe("song-of-solomon");
    expect(slugOf("EZK")).toBe("ezekiel");
    expect(slugOf("JOL")).toBe("joel");
    expect(slugOf("MAL")).toBe("malachi");
    expect(slugOf("MAT")).toBe("matthew");
    expect(slugOf("JHN")).toBe("john");
    expect(slugOf("PHP")).toBe("philippians");
    expect(slugOf("1JN")).toBe("1-john");
    expect(slugOf("3JN")).toBe("3-john");
    expect(slugOf("JUD")).toBe("jude");
    expect(slugOf("REV")).toBe("revelation");
  });
});

describe("findBookFile", () => {
  const files = [
    "JHN.usfm",
    "1JN.usfm",
    "73-JHNengwebp.usfm",
    "92-1JNengwebp.usfm",
    "00-FRTengwebp.usfm",
    "copr.htm",
  ];

  it("finds a BSB-style file name", () => {
    expect(findBookFile(files, "JHN")).toBe("JHN.usfm");
    expect(findBookFile(files, "1JN")).toBe("1JN.usfm");
  });

  it("finds a WEB-style file name", () => {
    expect(findBookFile(["73-JHNengwebp.usfm", "92-1JNengwebp.usfm"], "JHN")).toBe(
      "73-JHNengwebp.usfm",
    );
    expect(findBookFile(["73-JHNengwebp.usfm", "92-1JNengwebp.usfm"], "1JN")).toBe(
      "92-1JNengwebp.usfm",
    );
  });

  it("says which book is missing", () => {
    expect(() => findBookFile(["copr.htm"], "JHN")).toThrow(/JHN/);
  });
});

const JUDE = "\\id JUD\n\\c 1\n\\p\n\\v 1 Jude, a servant.\n\\v 2 Mercy to you.\n";

describe("importBook", () => {
  const jude = findBook("jude")!;

  it("returns one file per chapter with a path and the chapter data", () => {
    const files = importBook("bsb", jude, JUDE);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("bsb/jude/1.json");
    expect(files[0].data).toMatchObject({ version: "bsb", book: "jude", chapter: 1 });
    expect(files[0].data.blocks).toHaveLength(1);
  });

  it("names the book when the chapter count is wrong", () => {
    const john = findBook("john")!;
    expect(() => importBook("bsb", john, "\\c 1\n\\p \\v 1 One.\n\\c 2\n\\p \\v 1 Two.\n")).toThrow(
      /John: expected 21 chapters, found 2/,
    );
  });

  it("rejects a chapter without verses", () => {
    expect(() => importBook("bsb", jude, "\\c 1\n\\p Only text, no verse.\n")).toThrow(
      /Jude 1: no verses/,
    );
  });

  it("rejects verse numbers that repeat or go backwards", () => {
    expect(() => importBook("bsb", jude, "\\c 1\n\\p \\v 2 Two. \\v 1 One.\n")).toThrow(
      /Jude 1: verse 1 after verse 2/,
    );
    expect(() => importBook("bsb", jude, "\\c 1\n\\p \\v 1 One. \\v 1 One again.\n")).toThrow(
      /Jude 1: verse 1 after verse 1/,
    );
  });
});

describe("importVersion", () => {
  it("reads all 66 books through the supplied reader and lists the files it found", () => {
    const sources = new Map<string, string>();
    for (const [i, book] of BOOKS.entries()) {
      const chapters = Array.from(
        { length: book.chapters },
        (_, c) => `\\c ${c + 1}\n\\p \\v 1 Text.\n`,
      ).join("");
      sources.set(`${USFM_CODES[i]}.usfm`, chapters);
    }
    const files = importVersion("bsb", [...sources.keys()], (name) => sources.get(name)!);
    expect(files).toHaveLength(1189);
    expect(files[0].path).toBe("bsb/genesis/1.json");
    expect(files.at(-1)?.path).toBe("bsb/revelation/22.json");
  });

  it("fails clearly when a book file is missing", () => {
    expect(() => importVersion("bsb", ["GEN.usfm"], () => "\\c 1\n\\p \\v 1 x\n")).toThrow(/EXO/);
  });
});
