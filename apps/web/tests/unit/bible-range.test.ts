import { describe, expect, it } from "vitest";

import { parseVerseRange } from "@/lib/bible/range";

describe("parseVerseRange", () => {
  it("reads a single verse", () => {
    expect(parseVerseRange("16", 36)).toEqual({ from: 16, to: 16 });
  });

  it("reads a range", () => {
    expect(parseVerseRange("16-18", 36)).toEqual({ from: 16, to: 18 });
  });

  it("accepts the whole chapter as a range", () => {
    expect(parseVerseRange("1-36", 36)).toEqual({ from: 1, to: 36 });
  });

  it("accepts an en dash, as copied from printed references", () => {
    expect(parseVerseRange("16–18", 36)).toEqual({ from: 16, to: 18 });
  });

  it("rejects verse 0", () => {
    expect(parseVerseRange("0", 36)).toBeNull();
    expect(parseVerseRange("0-3", 36)).toBeNull();
  });

  it("rejects a reversed range", () => {
    expect(parseVerseRange("18-16", 36)).toBeNull();
  });

  it("rejects verses beyond the end of the chapter", () => {
    expect(parseVerseRange("37", 36)).toBeNull();
    expect(parseVerseRange("30-37", 36)).toBeNull();
  });

  it("rejects anything that is not one verse or one range of verses", () => {
    for (const bad of [
      "",
      " ",
      "abc",
      "1-2-3",
      "16,18",
      "-5",
      "5-",
      "1.5",
      "3:16",
      "16-18;20",
      "+5",
      "1e1",
    ]) {
      expect(parseVerseRange(bad, 36), bad).toBeNull();
    }
  });

  it("rejects surrounding whitespace rather than guessing", () => {
    expect(parseVerseRange(" 16", 36)).toBeNull();
    expect(parseVerseRange("16 ", 36)).toBeNull();
  });

  it("rejects absurdly long digit strings", () => {
    expect(parseVerseRange("9".repeat(400), 36)).toBeNull();
  });
});
