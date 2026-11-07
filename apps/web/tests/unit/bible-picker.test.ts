import { describe, expect, it } from "vitest";

import { findBook } from "@/lib/bible/books";
import { lastVerseOf } from "@/lib/bible/counts";
import {
  chapterNumbers,
  chooseBook,
  chooseChapter,
  chooseVerses,
  chooseVersion,
  chapterPages,
  pickVerse,
  readHref,
  STEPS,
  type PickerState,
} from "@/lib/bible/picker";

const start: PickerState = { version: "bsb", book: "john", chapter: 3, from: 16, to: 18 };

describe("lastVerseOf", () => {
  it("reads each version's own count", () => {
    const romans = findBook("romans")!;
    expect(lastVerseOf("bsb", findBook("john")!, 3)).toBe(36);
    expect(lastVerseOf("web", romans, 14)).toBe(26);
    expect(lastVerseOf("bsb", romans, 14)).toBe(23);
    expect(lastVerseOf("bsb", findBook("psalms")!, 119)).toBe(176);
  });

  it("falls back to the BSB for a version without counts yet (the ESV) and is 0 for a missing chapter", () => {
    const john = findBook("john")!;
    expect(lastVerseOf("esv", john, 3)).toBe(36);
    expect(lastVerseOf("bsb", john, 99)).toBe(0);
    expect(lastVerseOf("bsb", john, 0)).toBe(0);
  });
});

describe("STEPS", () => {
  it("are Bible, Book, Chapter, Verses in that order", () => {
    expect(STEPS).toEqual(["bible", "book", "chapter", "verses"]);
  });
});

describe("chapterNumbers", () => {
  it("has one number per chapter of the book", () => {
    expect(chapterNumbers(findBook("john")!)).toHaveLength(21);
    expect(chapterNumbers(findBook("john")!).slice(0, 3)).toEqual([1, 2, 3]);
    expect(chapterNumbers(findBook("psalms")!)).toHaveLength(150);
    expect(chapterNumbers(findBook("jude")!)).toEqual([1]);
  });
});

describe("chooseVersion", () => {
  it("keeps book, chapter and verses", () => {
    expect(chooseVersion(start, "web")).toEqual({ ...start, version: "web" });
  });

  it("cannot choose the disabled ESV or a version that does not exist", () => {
    expect(chooseVersion(start, "esv")).toBe(start);
    expect(chooseVersion(start, "kjv")).toBe(start);
    expect(chooseVersion(start, "")).toBe(start);
  });
});

describe("chooseBook", () => {
  it("resets to chapter 1 and clears the verses", () => {
    expect(chooseBook(start, "romans")).toEqual({
      version: "bsb",
      book: "romans",
      chapter: 1,
      from: null,
      to: null,
    });
  });

  it("ignores a book that does not exist", () => {
    expect(chooseBook(start, "nobook")).toBe(start);
  });
});

describe("chooseChapter", () => {
  it("sets the chapter and clears the verses", () => {
    expect(chooseChapter(start, 5)).toEqual({ ...start, chapter: 5, from: null, to: null });
  });

  it("ignores a chapter outside the book", () => {
    for (const bad of [0, 22, -1, 1.5, Number.NaN]) expect(chooseChapter(start, bad)).toBe(start);
  });
});

describe("chooseVerses", () => {
  const whole = { ...start, from: null, to: null };

  it("sets a range inside the chapter", () => {
    expect(chooseVerses(whole, 16, 18)).toEqual(start);
    expect(chooseVerses(whole, 5, 5)).toMatchObject({ from: 5, to: 5 });
  });

  it("keeps the steppers in range: from at least 1, to at most the last verse, to at least from", () => {
    expect(chooseVerses(whole, 0, 3)).toMatchObject({ from: 1, to: 3 });
    expect(chooseVerses(whole, 30, 99)).toMatchObject({ from: 30, to: 36 });
    expect(chooseVerses(whole, 99, 120)).toMatchObject({ from: 36, to: 36 });
    expect(chooseVerses(whole, 20, 10)).toMatchObject({ from: 20, to: 20 });
  });

  it("uses the version's own last verse", () => {
    const rom = { version: "bsb", book: "romans", chapter: 14, from: null, to: null };
    expect(chooseVerses(rom, 20, 26)).toMatchObject({ from: 20, to: 23 });
    expect(chooseVerses({ ...rom, version: "web" }, 20, 26)).toMatchObject({ from: 20, to: 26 });
  });

  it("clears the verses with nulls", () => {
    expect(chooseVerses(start, null, null)).toMatchObject({ from: null, to: null });
  });
});

describe("readHref", () => {
  it("goes to the chapter when no verses are chosen", () => {
    expect(readHref({ ...start, from: null, to: null })).toBe("/bible/bsb/john/3");
  });

  it("adds the verses as ?v=", () => {
    expect(readHref(start)).toBe("/bible/bsb/john/3?v=16-18");
    expect(readHref({ ...start, from: 16, to: 16 })).toBe("/bible/bsb/john/3?v=16");
  });

  it("follows the chosen version, book and chapter", () => {
    expect(readHref({ version: "web", book: "1-john", chapter: 4, from: null, to: null })).toBe(
      "/bible/web/1-john/4",
    );
  });
});

describe("pickVerse", () => {
  const whole: PickerState = { ...start, from: null, to: null };

  it("the first click chooses one verse and waits for an end", () => {
    expect(pickVerse(whole, null, 16)).toEqual({
      state: { ...whole, from: 16, to: 16 },
      anchor: 16,
    });
  });

  it("a second click after it makes a range, whichever way round", () => {
    const first = pickVerse(whole, null, 16);
    expect(pickVerse(first.state, first.anchor, 18)).toEqual({
      state: { ...whole, from: 16, to: 18 },
      anchor: null,
    });
    expect(pickVerse(first.state, first.anchor, 14)).toEqual({
      state: { ...whole, from: 14, to: 16 },
      anchor: null,
    });
  });

  it("clicking the same verse again keeps just that verse", () => {
    const first = pickVerse(whole, null, 16);
    expect(pickVerse(first.state, first.anchor, 16)).toEqual({
      state: { ...whole, from: 16, to: 16 },
      anchor: null,
    });
  });

  it("a click after a finished range starts a new choice", () => {
    expect(pickVerse(start, null, 30)).toEqual({
      state: { ...start, from: 30, to: 30 },
      anchor: 30,
    });
  });
});

describe("chapterPages", () => {
  it("keeps a short book in one page and splits a long one into pages of 25", () => {
    expect(chapterPages(findBook("john")!)).toEqual([{ first: 1, last: 21 }]);
    expect(chapterPages(findBook("genesis")!)).toEqual([
      { first: 1, last: 25 },
      { first: 26, last: 50 },
    ]);
    expect(chapterPages(findBook("psalms")!).map((p) => p.last)).toEqual([
      25, 50, 75, 100, 125, 150,
    ]);
  });
});
