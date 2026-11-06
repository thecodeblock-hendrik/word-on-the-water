import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { featured, latestPublished, loadDevotionals, published } from "@/lib/devotionals/load";

const file = (title: string, publishAt: string, n: number) => `---
title: ${title}
publishAt: ${publishAt}
author: Hendrik
series: advent
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

let dir: string;

function add(slug: string, content: string, cards = true) {
  mkdirSync(join(dir, slug));
  writeFileSync(join(dir, slug, "devotional.md"), content);
  if (!cards) return;
  for (const theme of ["dawn-patrol", "night-swell"]) {
    writeFileSync(join(dir, slug, `verse-card-${theme}.png`), "png");
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "devotionals-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("loadDevotionals", () => {
  it("loads every folder, newest first, and skips folders starting with an underscore", () => {
    add("advent-01", file("One", "2026-12-05", 1));
    add("advent-02", file("Two", "2026-12-12", 2));
    add("_template", "not a devotional", false);
    expect(loadDevotionals(dir).map((d) => d.slug)).toEqual(["advent-02", "advent-01"]);
  });

  it("names the folder when a devotional is invalid", () => {
    add("advent-01", file("One", "2026-12-05", 1).replace("author: Hendrik\n", ""));
    expect(() => loadDevotionals(dir)).toThrow(/advent-01[\s\S]*author/);
  });

  it("names the missing verse card file", () => {
    add("advent-01", file("One", "2026-12-05", 1), false);
    expect(() => loadDevotionals(dir)).toThrow(/advent-01[\s\S]*verse-card-dawn-patrol\.png/);
  });

  it("rejects two devotionals with the same series number", () => {
    add("advent-01", file("One", "2026-12-05", 1));
    add("advent-01b", file("Again", "2026-12-12", 1));
    expect(() => loadDevotionals(dir)).toThrow(/advent number 1 is used twice/);
  });
});

describe("published", () => {
  it("shows a devotional from its publish date, not before", () => {
    add("advent-01", file("One", "2026-12-05", 1));
    add("advent-02", file("Two", "2026-12-12", 2));
    const all = loadDevotionals(dir);
    expect(published(all, "2026-12-04")).toEqual([]);
    expect(published(all, "2026-12-05").map((d) => d.slug)).toEqual(["advent-01"]);
    expect(latestPublished(all, "2026-12-20")?.slug).toBe("advent-02");
    expect(latestPublished(all, "2026-12-01")).toBeUndefined();
  });
});

describe("featured", () => {
  it("is the latest published devotional, or the first one before any is published", () => {
    add("advent-01", file("One", "2026-12-05", 1));
    add("advent-02", file("Two", "2026-12-12", 2));
    const all = loadDevotionals(dir);
    expect(featured(all, "2026-11-06")?.slug).toBe("advent-01");
    expect(featured(all, "2026-12-05")?.slug).toBe("advent-01");
    expect(featured(all, "2026-12-13")?.slug).toBe("advent-02");
    expect(featured([], "2026-12-13")).toBeUndefined();
  });
});
