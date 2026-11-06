import { describe, expect, it } from "vitest";

import { parseDevotional } from "@/lib/devotionals/parse";

const header = `---
title: More Than Watchmen
publishAt: 2026-12-05
author: Hendrik
series: advent
seriesNumber: 1
passages: ["Psalm 130:5–6", "Isaiah 9:2"]
summary: Every dawn patrol starts in the dark.
emailSubject: Waiting for first light
tags: [waiting, hope]
conditions:
  - { text: "I wait for the LORD.", ref: "Psalm 130:5–6 (ESV)" }
reportConditions: Dark, light coming
keyVerse: { text: "My soul waits.", ref: "Psalm 130:6 (ESV)" }
imageAlt: Surfers sitting in a dark lineup.
---
`;

const body = `
## The Lineup

The alarm goes at 4:40.

## The Word

Psalm 130 opens "Out of the depths."

## Paddle Out

Sit in the dark for two minutes.

## Pray

Lord, I am in the dark. Amen.

## Go Deeper

**Read further:** All of Psalm 130.
`;

const source = header + body;

describe("parseDevotional", () => {
  it("reads the header and the sections in order", () => {
    const d = parseDevotional(source, "advent-01-more-than-watchmen");
    expect(d.slug).toBe("advent-01-more-than-watchmen");
    expect(d.meta.title).toBe("More Than Watchmen");
    expect(d.meta.publishAt).toBe("2026-12-05");
    expect(d.meta.passages).toEqual(["Psalm 130:5–6", "Isaiah 9:2"]);
    expect(d.sections.map((s) => s.heading)).toEqual([
      "The Lineup",
      "The Word",
      "Paddle Out",
      "Pray",
      "Go Deeper",
    ]);
    expect(d.sections[0].markdown).toBe("The alarm goes at 4:40.");
  });

  it("allows Go Deeper to be left out", () => {
    const d = parseDevotional(header + body.split("## Go Deeper")[0], "x");
    expect(d.sections.map((s) => s.heading)).not.toContain("Go Deeper");
  });

  it("works out the read time from the word count, at least one minute", () => {
    expect(parseDevotional(source, "x").readMinutes).toBe(1);
    const long = body.replace("The alarm goes at 4:40.", "word ".repeat(450));
    expect(parseDevotional(header + long, "x").readMinutes).toBe(3);
  });

  it("rejects a missing header field and names it", () => {
    const bad = source.replace("author: Hendrik\n", "");
    expect(() => parseDevotional(bad, "x")).toThrow(/author/);
  });

  it("rejects an unknown header field, which is usually a typo", () => {
    const bad = source.replace("author: Hendrik", "author: Hendrik\nautor: Hendrik");
    expect(() => parseDevotional(bad, "x")).toThrow(/autor/);
  });

  it("rejects a series that is not a lowercase folder name", () => {
    const bad = source.replace("series: advent", "series: Advent Calendar");
    expect(() => parseDevotional(bad, "x")).toThrow(/series/);
  });

  it("rejects a publish date that is not YYYY-MM-DD", () => {
    const bad = source.replace("2026-12-05", "5 December 2026");
    expect(() => parseDevotional(bad, "x")).toThrow(/publishAt/);
  });

  it("rejects a Go Deeper paragraph without a bold label", () => {
    const bad = source.replace("**Read further:** All of Psalm 130.", "All of Psalm 130.");
    expect(() => parseDevotional(bad, "x")).toThrow(/Go Deeper/);
  });

  it("rejects a missing required section", () => {
    const bad = source.replace("## Pray\n\nLord, I am in the dark. Amen.\n\n", "");
    expect(() => parseDevotional(bad, "x")).toThrow(/Pray/);
  });

  it("rejects sections in the wrong order", () => {
    const bad = source.replace("## The Word", "## Swapped").replace("## Paddle Out", "## The Word");
    expect(() => parseDevotional(bad, "x")).toThrow(/Swapped|order/);
  });

  it("rejects an unknown section heading", () => {
    expect(() => parseDevotional(source + "\n## Extras\n\nText.\n", "x")).toThrow(/Extras/);
  });

  it("rejects text before the first section", () => {
    expect(() => parseDevotional(header + "\nStray text.\n" + body, "x")).toThrow(/before/i);
  });

  it("rejects a file with no header block", () => {
    expect(() => parseDevotional(body, "x")).toThrow(/header/i);
  });
});
