import { describe, expect, it } from "vitest";

import { lastVerse, parseUsfm, verseNumbers } from "@/lib/bible/usfm";

const run = (verse: number | null, text: string, start = false, end: number | null = null) => ({
  verse,
  end,
  start,
  text,
});

describe("parseUsfm chapters and header", () => {
  it("splits chapters on \\c and ignores book header markers", () => {
    const chapters = parseUsfm(
      [
        "\\id JHN Test",
        "\\usfm 3.1",
        "\\ide UTF-8",
        "\\h John",
        "\\toc1 The Gospel According to John",
        "\\mt1 John",
        "\\c 1",
        "\\p",
        "\\v 1 First.",
        "\\c 2  ",
        "\\p",
        "\\v 1 Second.",
      ].join("\n"),
    );
    expect(chapters.map((c) => c.chapter)).toEqual([1, 2]);
    expect(chapters[1].blocks).toEqual([
      { kind: "paragraph", indent: 0, runs: [run(1, "Second.", true)] },
    ]);
  });

  it("ignores markers it does not render (cross-reference lines, front matter, chapter labels)", () => {
    const [chapter] = parseUsfm(
      [
        "\\c 1",
        "\\cl Psalm",
        "\\ip An introduction.",
        "\\r (\\ref Genesis 1:1|GEN 1:1\\ref*)",
        "\\p",
        "\\v 1 Text.",
      ].join("\n"),
    );
    expect(chapter.blocks).toEqual([
      { kind: "paragraph", indent: 0, runs: [run(1, "Text.", true)] },
    ]);
  });
});

describe("parseUsfm verses and paragraphs", () => {
  it("keeps several verses in one paragraph as separate runs", () => {
    const [chapter] = parseUsfm("\\c 1\n\\p \\v 1 One. \\v 2 Two.\n");
    expect(chapter.blocks).toEqual([
      { kind: "paragraph", indent: 0, runs: [run(1, "One.", true), run(2, "Two.", true)] },
    ]);
  });

  it("continues a verse into the next paragraph without starting it again", () => {
    const [chapter] = parseUsfm(
      "\\c 1\n\\p \\v 1 Begins here\n\\p and goes on.\n\\p \\v 2 Next.\n",
    );
    expect(chapter.blocks).toEqual([
      { kind: "paragraph", indent: 0, runs: [run(1, "Begins here", true)] },
      { kind: "paragraph", indent: 0, runs: [run(1, "and goes on.")] },
      { kind: "paragraph", indent: 0, runs: [run(2, "Next.", true)] },
    ]);
  });

  it("reads verses on the line after an empty paragraph marker (WEB layout)", () => {
    const [chapter] = parseUsfm("\\c 1\n\\p\n\\v 1 One.\n\\v 2 Two.\n\\p\n\\v 3 Three.\n");
    expect(chapter.blocks).toEqual([
      { kind: "paragraph", indent: 0, runs: [run(1, "One.", true), run(2, "Two.", true)] },
      { kind: "paragraph", indent: 0, runs: [run(3, "Three.", true)] },
    ]);
  });

  it("starts a verse when its number is on its own line and the text follows", () => {
    const [chapter] = parseUsfm("\\c 1\n\\p\n\\v 1\nText on the next line.\n");
    expect(chapter.blocks).toEqual([
      { kind: "paragraph", indent: 0, runs: [run(1, "Text on the next line.", true)] },
    ]);
  });

  it("allows verse numbers to skip", () => {
    const [chapter] = parseUsfm("\\c 17\n\\p \\v 20 Twenty. \\v 22 Twenty-two.\n");
    expect(verseNumbers(chapter)).toEqual([20, 22]);
    expect(lastVerse(chapter)).toBe(22);
  });

  it("keeps a combined verse such as 3-4 as one verse labelled with its end", () => {
    const [chapter] = parseUsfm("\\c 1\n\\p \\v 3-4 Joined text.\n");
    expect(chapter.blocks).toEqual([
      { kind: "paragraph", indent: 0, runs: [run(3, "Joined text.", true, 4)] },
    ]);
    expect(verseNumbers(chapter)).toEqual([3, 4]);
  });

  it("starts each chapter without a current verse", () => {
    const chapters = parseUsfm(
      "\\c 1\n\\p \\v 9 Nine.\n\\c 2\n\\p Before any verse.\n\\p \\v 1 One.\n",
    );
    expect(chapters[1].blocks[0]).toEqual({
      kind: "paragraph",
      indent: 0,
      runs: [run(null, "Before any verse.")],
    });
  });
});

describe("parseUsfm headings, poetry, lists and labels", () => {
  it("maps section headings to levels", () => {
    const [chapter] = parseUsfm(
      "\\c 1\n\\ms BOOK I\n\\s1 The Beginning\n\\s2 A part\n\\p \\v 1 Text.\n",
    );
    expect(chapter.blocks.slice(0, 3)).toEqual([
      { kind: "heading", level: 1, text: "BOOK I" },
      { kind: "heading", level: 2, text: "The Beginning" },
      { kind: "heading", level: 3, text: "A part" },
    ]);
  });

  it("keeps poetry lines with their indent and a blank line as a break", () => {
    const [chapter] = parseUsfm(
      "\\c 1\n\\q1 \\v 1 Line one,\n\\q2 line two,\n\\b\n\\q1 \\v 2 Stanza two.\n\\qr says the LORD.\n",
    );
    expect(chapter.blocks).toEqual([
      { kind: "poetry", indent: 1, runs: [run(1, "Line one,", true)] },
      { kind: "poetry", indent: 2, runs: [run(1, "line two,")] },
      { kind: "break" },
      { kind: "poetry", indent: 1, runs: [run(2, "Stanza two.", true)] },
      { kind: "poetry", indent: 2, runs: [run(2, "says the LORD.")] },
    ]);
  });

  it("keeps list items and indented paragraphs", () => {
    const [chapter] = parseUsfm("\\c 1\n\\li1 \\v 5 Item one\n\\li2 sub item\n\\pi1 Indented.\n");
    expect(chapter.blocks).toEqual([
      { kind: "list", indent: 1, runs: [run(5, "Item one", true)] },
      { kind: "list", indent: 2, runs: [run(5, "sub item")] },
      { kind: "paragraph", indent: 1, runs: [run(5, "Indented.")] },
    ]);
  });

  it("keeps speaker names and acrostic letters as labels", () => {
    const [chapter] = parseUsfm(
      "\\c 1\n\\p\n\\v 1 Song.\n\\sp Beloved\n\\q1 \\v 2 Kiss me.\n\\qa ALEPH\n",
    );
    const labels = chapter.blocks.filter((b) => b.kind === "label");
    expect(labels).toEqual([
      { kind: "label", text: "Beloved" },
      { kind: "label", text: "ALEPH" },
    ]);
  });

  it("drops paragraphs that end up with no text", () => {
    const [chapter] = parseUsfm("\\c 1\n\\p\n\\p\n\\p \\v 1 Text.\n");
    expect(chapter.blocks).toHaveLength(1);
  });
});

describe("parseUsfm Psalm titles", () => {
  it("keeps a title with no verse number (WEB layout)", () => {
    const [chapter] = parseUsfm("\\c 3\n\\d A Psalm by David.\n\\q1\n\\v 1 LORD, how many.\n");
    expect(chapter.blocks).toEqual([
      { kind: "title", text: "A Psalm by David." },
      { kind: "poetry", indent: 1, runs: [run(1, "LORD, how many.", true)] },
    ]);
  });

  it("moves a verse marker inside the title onto the first verse after it (BSB layout)", () => {
    const [chapter] = parseUsfm(
      "\\c 3\n\\s1 Deliver Me\n\\d \\v 1 A Psalm of David.\n\\b\n\\q1 O LORD, how many!\n\\q2 How many rise!\n\\q1 \\v 2 Many say.\n",
    );
    expect(chapter.blocks).toEqual([
      { kind: "heading", level: 2, text: "Deliver Me" },
      { kind: "title", text: "A Psalm of David." },
      { kind: "break" },
      { kind: "poetry", indent: 1, runs: [run(1, "O LORD, how many!", true)] },
      { kind: "poetry", indent: 2, runs: [run(1, "How many rise!")] },
      { kind: "poetry", indent: 1, runs: [run(2, "Many say.", true)] },
    ]);
    expect(verseNumbers(chapter)).toEqual([1, 2]);
  });
});

describe("parseUsfm text cleaning", () => {
  it("drops footnotes, including nested markers, and keeps the words around them", () => {
    const [chapter] = parseUsfm(
      "\\c 1\n\\p \\v 5 It has not overcome\\f + \\fr 1:5 \\ft Or \\fqa comprehended \\+wh אֱלֹהִ\\+wh*\\f* it.\n",
    );
    expect(chapter.blocks[0]).toEqual({
      kind: "paragraph",
      indent: 0,
      runs: [run(5, "It has not overcome it.", true)],
    });
  });

  it("keeps the word and drops the Strong's number, including inside contractions", () => {
    const [chapter] = parseUsfm(
      '\\c 1\n\\p\n\\v 5 \\w The|strong="G1"\\w* \\w darkness|strong="G2"\\w* hasn’\\w t|strong="G3"\\w* \\w won|strong="G4"\\w*.\n',
    );
    expect(chapter.blocks[0]).toMatchObject({ runs: [run(5, "The darkness hasn’t won.", true)] });
  });

  it("keeps words of Jesus and Selah as plain text, including nested Strong's tags", () => {
    const [chapter] = parseUsfm(
      '\\c 1\n\\p \\v 1 He said, \\wj \\+w Follow|strong="G1"\\+w* me\\wj*. \\qs Selah.\\qs*\n',
    );
    expect(chapter.blocks[0]).toMatchObject({ runs: [run(1, "He said, Follow me. Selah.", true)] });
  });

  it("leaves out a verse whose only content is a footnote, as the WEB does for Luke 17:36", () => {
    const [chapter] = parseUsfm(
      "\\c 17\n\\p\n\\v 35 Two women.\n\\v 36 \\f + \\fr 17:36 \\ft Some manuscripts add more.\\f*\n\\v 37 Next.\n",
    );
    expect(verseNumbers(chapter)).toEqual([35, 37]);
  });

  it("does not change the words: curly quotes, dashes and numbers stay exactly as written", () => {
    const [chapter] = parseUsfm("\\c 1\n\\p \\v 1 “For God so loved — 6,800 men — ‘the world’…”\n");
    expect(chapter.blocks[0]).toMatchObject({
      runs: [run(1, "“For God so loved — 6,800 men — ‘the world’…”", true)],
    });
  });

  it("collapses repeated spaces and trailing spaces", () => {
    const [chapter] = parseUsfm("\\c 1  \n\\p  \n\\v 1 One   two.   \n");
    expect(chapter.blocks[0]).toMatchObject({ runs: [run(1, "One two.", true)] });
  });

  it("accepts Windows line endings", () => {
    const [chapter] = parseUsfm("\\c 1\r\n\\p\r\n\\v 1 One.\r\n");
    expect(chapter.blocks[0]).toMatchObject({ runs: [run(1, "One.", true)] });
  });
});
