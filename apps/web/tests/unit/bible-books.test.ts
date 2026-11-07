import { describe, expect, it } from "vitest";

import { BOOKS, findBook, hasChapter, neighbours } from "@/lib/bible/books";

describe("BOOKS", () => {
  it("lists the 66 books in canonical order", () => {
    expect(BOOKS).toHaveLength(66);
    expect(BOOKS[0].name).toBe("Genesis");
    expect(BOOKS[38].name).toBe("Malachi");
    expect(BOOKS[39].name).toBe("Matthew");
    expect(BOOKS[65].name).toBe("Revelation");
  });

  it("has 39 Old Testament and 27 New Testament books", () => {
    expect(BOOKS.filter((b) => b.testament === "old")).toHaveLength(39);
    expect(BOOKS.filter((b) => b.testament === "new")).toHaveLength(27);
  });

  it("has unique, URL-safe slugs", () => {
    const slugs = BOOKS.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(66);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("has 1,189 chapters in total", () => {
    expect(BOOKS.reduce((sum, b) => sum + b.chapters, 0)).toBe(1189);
  });

  it("has the right chapter count for well-known books", () => {
    const chapters = (slug: string) => findBook(slug)?.chapters;
    expect(chapters("genesis")).toBe(50);
    expect(chapters("psalms")).toBe(150);
    expect(chapters("isaiah")).toBe(66);
    expect(chapters("matthew")).toBe(28);
    expect(chapters("john")).toBe(21);
    expect(chapters("revelation")).toBe(22);
  });

  it("has one chapter in the single-chapter books", () => {
    for (const slug of ["obadiah", "philemon", "2-john", "3-john", "jude"]) {
      expect(findBook(slug)?.chapters).toBe(1);
    }
  });
});

describe("findBook", () => {
  it("finds a book by slug, including numbered and multi-word names", () => {
    expect(findBook("john")?.name).toBe("John");
    expect(findBook("1-john")?.name).toBe("1 John");
    expect(findBook("song-of-solomon")?.name).toBe("Song of Solomon");
  });

  it("returns undefined for an unknown slug", () => {
    expect(findBook("nobook")).toBeUndefined();
    expect(findBook("")).toBeUndefined();
  });

  it("is exact: no case folding and no names", () => {
    expect(findBook("John")).toBeUndefined();
    expect(findBook("1 John")).toBeUndefined();
  });
});

describe("hasChapter", () => {
  const john = findBook("john")!;

  it("accepts chapters from 1 to the last", () => {
    expect(hasChapter(john, 1)).toBe(true);
    expect(hasChapter(john, 21)).toBe(true);
  });

  it("rejects 0, past the end, negatives and non-integers", () => {
    expect(hasChapter(john, 0)).toBe(false);
    expect(hasChapter(john, 22)).toBe(false);
    expect(hasChapter(john, -1)).toBe(false);
    expect(hasChapter(john, 1.5)).toBe(false);
    expect(hasChapter(john, Number.NaN)).toBe(false);
  });
});

describe("neighbours", () => {
  const at = (slug: string, chapter: number) => neighbours(findBook(slug)!, chapter);

  it("steps within a book", () => {
    expect(at("john", 3)).toEqual({
      previous: { book: "john", chapter: 2 },
      next: { book: "john", chapter: 4 },
    });
  });

  it("has no previous at Genesis 1 and no next at Revelation 22", () => {
    expect(at("genesis", 1).previous).toBeNull();
    expect(at("revelation", 22).next).toBeNull();
    expect(at("revelation", 22).previous).toEqual({ book: "revelation", chapter: 21 });
  });

  it("crosses into the next book, including the Testament boundary", () => {
    expect(at("genesis", 50).next).toEqual({ book: "exodus", chapter: 1 });
    expect(at("malachi", 4).next).toEqual({ book: "matthew", chapter: 1 });
    expect(at("matthew", 1).previous).toEqual({ book: "malachi", chapter: 4 });
  });

  it("crosses into the last chapter of the previous book", () => {
    expect(at("exodus", 1).previous).toEqual({ book: "genesis", chapter: 50 });
    expect(at("john", 1).previous).toEqual({ book: "luke", chapter: 24 });
  });

  it("handles single-chapter books", () => {
    expect(at("obadiah", 1)).toEqual({
      previous: { book: "amos", chapter: 9 },
      next: { book: "jonah", chapter: 1 },
    });
  });
});
