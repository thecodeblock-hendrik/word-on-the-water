import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseSeries } from "@/lib/devotionals/series";
import { loadSeries } from "@/lib/devotionals/series-load";

const source = `title: Advent
tagline: waiting for the light
artAlt: Surfers sitting in a dark lineup.
outline:
  - { number: 1, title: More Than Watchmen, passage: "Psalm 130:5–6; Isaiah 9:2", date: 2026-12-05 }
  - { number: 2, title: The Long Wait, passage: "Luke 1:5–25", date: 2026-12-12 }
`;

describe("parseSeries", () => {
  it("reads the series and its outline", () => {
    const s = parseSeries(source, "advent");
    expect(s.slug).toBe("advent");
    expect(s.title).toBe("Advent");
    expect(s.outline.map((o) => o.title)).toEqual(["More Than Watchmen", "The Long Wait"]);
    expect(s.outline[1].date).toBe("2026-12-12");
  });

  it("rejects a missing field and an unknown field", () => {
    expect(() => parseSeries(source.replace("tagline: waiting for the light\n", ""), "a")).toThrow(
      /tagline/,
    );
    expect(() => parseSeries(source + "taglin: x\n", "a")).toThrow(/taglin/);
  });

  it("rejects an outline that does not count 1, 2, 3 in order", () => {
    expect(() => parseSeries(source.replace("number: 2", "number: 3"), "a")).toThrow(/outline/);
  });

  it("rejects an empty outline", () => {
    expect(() => parseSeries(source.split("outline:")[0] + "outline: []\n", "a")).toThrow(
      /outline/,
    );
  });
});

describe("loadSeries", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "series-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  function add(slug: string, art = true) {
    mkdirSync(join(dir, slug));
    writeFileSync(join(dir, slug, "series.yml"), source);
    if (!art) return;
    for (const theme of ["dawn-patrol", "night-swell"]) {
      writeFileSync(join(dir, slug, `art-${theme}.png`), "png");
    }
  }

  it("loads every series folder and skips folders starting with an underscore", () => {
    add("advent");
    add("_template");
    expect(loadSeries(dir).map((s) => s.slug)).toEqual(["advent"]);
  });

  it("names the missing art file", () => {
    add("advent", false);
    expect(() => loadSeries(dir)).toThrow(/advent[\s\S]*art-dawn-patrol\.png/);
  });
});
