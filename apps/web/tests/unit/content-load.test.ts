import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadContent } from "@/lib/devotionals/load";

const series = `title: Advent
tagline: waiting for the light
artAlt: Alt.
outline:
  - { number: 1, title: One, passage: "Psalm 130:5–6", date: 2026-12-05 }
  - { number: 2, title: Two, passage: "Luke 1:5–25", date: 2026-12-12 }
`;

const devotional = (seriesSlug: string, n: number) => `---
title: One
publishAt: 2026-12-05
author: Hendrik
series: ${seriesSlug}
seriesNumber: ${n}
passages: ["Psalm 130:5–6"]
summary: A summary.
emailSubject: A subject
tags: [hope]
conditions:
  - { text: "A verse.", ref: "Psalm 130:5 (ESV)" }
reportConditions: Dark, light coming
keyVerse: { text: "A verse.", ref: "Psalm 130:6 (ESV)" }
imageAlt: Alt text.
---

## The Lineup

One.

## The Word

Two.

## Paddle Out

Three.

## Pray

Four. Amen.
`;

let root: string;

function build(seriesSlug: string, n: number) {
  mkdirSync(join(root, "series", "advent"), { recursive: true });
  writeFileSync(join(root, "series", "advent", "series.yml"), series);
  for (const theme of ["dawn-patrol", "night-swell"]) {
    writeFileSync(join(root, "series", "advent", `art-${theme}.png`), "png");
  }
  mkdirSync(join(root, "devotionals", "advent-01"), { recursive: true });
  writeFileSync(join(root, "devotionals", "advent-01", "devotional.md"), devotional(seriesSlug, n));
  for (const theme of ["dawn-patrol", "night-swell"]) {
    writeFileSync(join(root, "devotionals", "advent-01", `verse-card-${theme}.png`), "png");
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "content-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("loadContent", () => {
  it("loads devotionals and series that agree", () => {
    build("advent", 1);
    const { devotionals, series: all } = loadContent(root);
    expect(devotionals).toHaveLength(1);
    expect(all.map((s) => s.slug)).toEqual(["advent"]);
  });

  it("rejects a devotional whose series does not exist", () => {
    build("wind-and-sea", 1);
    expect(() => loadContent(root)).toThrow(/advent-01[\s\S]*wind-and-sea/);
  });

  it("rejects a series number that is not in the series outline", () => {
    build("advent", 6);
    expect(() => loadContent(root)).toThrow(/advent-01[\s\S]*6/);
  });
});
