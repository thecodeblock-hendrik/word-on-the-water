import { describe, expect, it } from "vitest";

import { goDeeperItems, splitAmen, splitBlocks } from "@/lib/devotionals/blocks";

describe("splitBlocks", () => {
  it("splits paragraphs on blank lines and marks lines starting with > as pull quotes", () => {
    const text = "First paragraph.\n\n> A pulled line.\n\nSecond paragraph\nover two lines.";
    expect(splitBlocks(text)).toEqual([
      { kind: "paragraph", text: "First paragraph." },
      { kind: "quote", text: "A pulled line." },
      { kind: "paragraph", text: "Second paragraph over two lines." },
    ]);
  });
});

describe("goDeeperItems", () => {
  it("reads **Label:** text paragraphs", () => {
    const text = "**Talk it over with a mate:** What darkness?\n\n**Read further:** Psalm 130.";
    expect(goDeeperItems(text)).toEqual([
      { term: "Talk it over with a mate", text: "What darkness?" },
      { term: "Read further", text: "Psalm 130." },
    ]);
  });

  it("rejects a paragraph without a bold label", () => {
    expect(() => goDeeperItems("Just some text.")).toThrow(/Go Deeper/);
  });
});

describe("splitAmen", () => {
  it("separates a closing Amen so it can be styled", () => {
    expect(splitAmen("Teach me to wait. Amen.")).toEqual({
      body: "Teach me to wait.",
      amen: "Amen.",
    });
  });

  it("leaves a prayer without a closing Amen alone", () => {
    expect(splitAmen("Teach me to wait.")).toEqual({ body: "Teach me to wait.", amen: undefined });
  });
});
