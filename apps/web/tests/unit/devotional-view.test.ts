import { describe, expect, it } from "vitest";

import { formatDate, formatDateLong, formatDateShort } from "@/lib/devotionals/format";
import { featured, isViewable } from "@/lib/devotionals/load";
import { parseDevotional } from "@/lib/devotionals/parse";
import { parseSeries } from "@/lib/devotionals/series";
import { seriesView } from "@/lib/devotionals/series-view";

const series = parseSeries(
  `title: Advent
tagline: Waiting for the light
artAlt: Alt.
outline:
  - { number: 1, title: One Working, passage: "Psalm 130:5–6", date: 2026-12-05 }
  - { number: 2, title: Two Working, passage: "Luke 1:5–25", date: 2026-12-12 }
  - { number: 3, title: Three Working, passage: "Matthew 1:18–25", date: 2026-12-19 }
`,
  "advent",
);

const devotional = (n: number, title: string, publishAt: string) =>
  parseDevotional(
    `---
title: ${title}
publishAt: ${publishAt}
author: Hendrik
series: advent
seriesNumber: ${n}
passages: ["Psalm 130:5–6", "Isaiah 9:2"]
summary: A summary.
emailSubject: A subject
tags: [hope]
conditions:
  - { text: "A verse.", ref: "Psalm 130:5 (ESV)" }
reportConditions: Dark
keyVerse: { text: "A verse.", ref: "Psalm 130:6 (ESV)" }
imageAlt: Alt.
---

## The Lineup

One.

## The Word

Two.

## Paddle Out

Three.

## Pray

Four. Amen.
`,
    `advent-0${n}`,
  );

const one = devotional(1, "More Than Watchmen", "2026-12-05");
const two = devotional(2, "The Long Wait", "2026-12-12");

describe("date formats", () => {
  it("writes long, plain and short dates", () => {
    expect(formatDateLong("2026-12-05")).toBe("Saturday 5 December 2026");
    expect(formatDate("2026-12-05")).toBe("5 December 2026");
    expect(formatDateShort("2026-12-08")).toBe("8 Dec");
  });
});

describe("seriesView", () => {
  it("lists every planned week, using the real devotional where one exists", () => {
    const view = seriesView(one, series, [one], "2026-12-05");
    expect(view.items.map((i) => i.title)).toEqual([
      "More Than Watchmen",
      "Two Working",
      "Three Working",
    ]);
    expect(view.items.map((i) => i.current)).toEqual([true, false, false]);
    expect(view.items[0].passage).toBe("Psalm 130:5–6; Isaiah 9:2");
    expect(view.items[1].passage).toBe("Luke 1:5–25");
  });

  it("links a week only once its devotional is published", () => {
    expect(seriesView(one, series, [two, one], "2026-12-05").items[1].href).toBeUndefined();
    expect(seriesView(one, series, [two, one], "2026-12-12").items[1].href).toBe(
      "/devotionals/advent-02",
    );
  });

  it("uses the real title and passage as soon as a week's devotional file exists", () => {
    const view = seriesView(one, series, [two, one], "2026-12-05");
    expect(view.items[1]).toMatchObject({
      title: "The Long Wait",
      passage: "Psalm 130:5–6; Isaiah 9:2",
    });
  });

  it("points back to Start here from week 1 and forward to the next week", () => {
    const view = seriesView(one, series, [one], "2026-12-05");
    expect(view.previous).toEqual({ label: "New here?", title: "Start here", href: "/#start" });
    expect(view.next).toMatchObject({ label: "Next · 12 December", title: "Two Working" });
    expect(view.next?.href).toBeUndefined();
  });

  it("points back to the previous week once it exists, and has no next after the last week", () => {
    const view = seriesView(two, series, [two, one], "2026-12-12");
    expect(view.previous).toMatchObject({
      label: "Previous · 5 December",
      title: "More Than Watchmen",
      href: "/devotionals/advent-01",
    });
    const last = devotional(3, "Quiet", "2026-12-19");
    expect(seriesView(last, series, [last, two, one], "2026-12-19").next).toBeUndefined();
  });

  it("names the next week for the Go Deeper line", () => {
    expect(seriesView(one, series, [one], "2026-12-05").next?.passage).toBe("Luke 1:5–25");
  });
});

describe("isViewable", () => {
  it("shows published devotionals, and the first one before any is published", () => {
    const all = [two, one];
    expect(isViewable(all, "advent-01", "2026-11-06")).toBe(true);
    expect(isViewable(all, "advent-02", "2026-11-06")).toBe(false);
    expect(isViewable(all, "advent-02", "2026-12-12")).toBe(true);
    expect(isViewable(all, "advent-03", "2026-12-12")).toBe(false);
    expect(featured(all, "2026-11-06")?.slug).toBe("advent-01");
  });
});
