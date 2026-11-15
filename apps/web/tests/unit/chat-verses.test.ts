import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { verseHref } from "@/lib/chat/verses";

const kb = JSON.parse(readFileSync("../api/app/data/faith_kb.json", "utf8")) as {
  entries: { key_verses: string[] }[];
  glossary: { key_verses: string[] }[];
};

describe("verseHref", () => {
  it.each([
    ["John 3:16", "/bible/web/john/3?v=16"],
    ["Romans 3:23–24", "/bible/web/romans/3?v=23-24"],
    ["1 Corinthians 15:1–4", "/bible/web/1-corinthians/15?v=1-4"],
    ["Acts 16:15, 31–34", "/bible/web/acts/16?v=15"],
    ["Luke 24:25–27, 44", "/bible/web/luke/24?v=25-27"],
    ["Psalm 19:1–4", "/bible/web/psalms/19?v=1-4"],
    ["Jude 3", "/bible/web/jude/1?v=3"],
    ["Jude 3–4", "/bible/web/jude/1?v=3-4"],
    ["Isaiah 53", "/bible/web/isaiah/53"],
    ["Matthew 5–7", "/bible/web/matthew/5"],
    ["Genesis 1:1–2:3", "/bible/web/genesis/1"],
    ["1 Thessalonians 4:13–5:11", "/bible/web/1-thessalonians/4"],
  ])("%s goes to %s", (reference, href) => {
    expect(verseHref(reference)).toBe(href);
  });

  it.each(["", "Hezekiah 3:1", "John 99:1", "John 3:0", "nonsense", "John"])(
    "gives no link for %j",
    (reference) => {
      expect(verseHref(reference)).toBeNull();
    },
  );

  it("links every key verse in the knowledge base", () => {
    const all = [...kb.entries, ...kb.glossary].flatMap((e) => e.key_verses);
    expect(all.length).toBeGreaterThan(1000);
    expect(all.filter((v) => verseHref(v) === null)).toEqual([]);
  });
});
