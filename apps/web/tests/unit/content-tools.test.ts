import { describe, expect, it } from "vitest";

import { findPlaceholders, splitPlaceholders } from "@/lib/placeholders";
import { ESV_NOTICE, formatReference } from "@/lib/scripture";

describe("formatReference", () => {
  it("formats book, chapter and verse", () => {
    expect(formatReference({ book: "Mark", chapter: 4, verses: "41" })).toBe("Mark 4:41");
  });

  it("keeps ranges and numbered books", () => {
    expect(formatReference({ book: "1 Corinthians", chapter: 15, verses: "3–4" })).toBe(
      "1 Corinthians 15:3–4",
    );
  });

  it("formats a whole-chapter reference without a verse", () => {
    expect(formatReference({ book: "Genesis", chapter: 1 })).toBe("Genesis 1");
  });
});

describe("ESV notice", () => {
  it("carries the Crossway permission wording", () => {
    expect(ESV_NOTICE).toMatch(/ESV/);
    expect(ESV_NOTICE).toMatch(/Crossway/);
    expect(ESV_NOTICE).toMatch(/Used by permission\. All rights reserved\./);
  });
});

describe("splitPlaceholders", () => {
  it("returns plain text as one segment", () => {
    expect(splitPlaceholders("Hello")).toEqual([{ text: "Hello", placeholder: false }]);
  });

  it("marks bracketed text, keeping the brackets in the text", () => {
    expect(splitPlaceholders("Hi [name], welcome")).toEqual([
      { text: "Hi ", placeholder: false },
      { text: "[name]", placeholder: true },
      { text: ", welcome", placeholder: false },
    ]);
  });

  it("handles a string that is only a placeholder", () => {
    expect(splitPlaceholders("[x]")).toEqual([{ text: "[x]", placeholder: true }]);
  });
});

describe("findPlaceholders", () => {
  it("finds them in nested objects and arrays with their path", () => {
    const content = { a: "fine", b: { c: ["ok", "has [one]"] }, d: 3 };
    expect(findPlaceholders(content)).toEqual([{ path: "b.c.1", text: "[one]" }]);
  });

  it("returns nothing when the content is clean", () => {
    expect(findPlaceholders({ a: "fine", b: ["ok"] })).toEqual([]);
  });

  it("reports every placeholder in one string", () => {
    expect(findPlaceholders({ a: "[x] and [y]" })).toEqual([
      { path: "a", text: "[x]" },
      { path: "a", text: "[y]" },
    ]);
  });
});
