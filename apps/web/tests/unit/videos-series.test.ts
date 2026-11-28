import { describe, expect, it } from "vitest";

import { loadVideoSeries } from "@/lib/videos/load";
import { parseVideoSeries, totalMinutes, weekState } from "@/lib/videos/series";

const source = `title: Advent word studies
introduction: Four short videos.
noCurrentWeekFrom: 2026-12-27
videos:
  - { theme: Hope, word: Yakhal, title: Hope, from: 2026-11-29, length: "4:33", youtubeId: 4WYNBjJSYvE, sourceUrl: "https://bibleproject.com/videos/yakhal-hope/", intro: One. }
  - { theme: Peace, word: Shalom, title: Shalom - Peace, from: 2026-12-06, length: "3:48", youtubeId: oLYORLZOaZE, sourceUrl: "https://bibleproject.com/videos/shalom-peace/", intro: Two. }
`;

const series = parseVideoSeries(source, "advent");

describe("parseVideoSeries", () => {
  it("reads the series and gives each video the name used in ?week=", () => {
    expect(series.slug).toBe("advent");
    expect(series.videos.map((v) => v.week)).toEqual(["hope", "peace"]);
    expect(series.videos[1].youtubeId).toBe("oLYORLZOaZE");
  });

  it.each(["theme", "word", "title", "from", "length", "youtubeId", "sourceUrl", "intro"])(
    "fails when a video has no %s",
    (field) => {
      const without = source.replace(new RegExp(`(?<=[{,] )${field}: ("[^"]*"|[^,}]+)(, )?`), "");
      expect(() => parseVideoSeries(without, "advent")).toThrow(new RegExp(`videos.0.${field}`));
    },
  );

  it.each(["title", "introduction", "noCurrentWeekFrom"])("fails without %s", (field) => {
    const without = source.replace(new RegExp(`^${field}: .*\n`, "m"), "");
    expect(() => parseVideoSeries(without, "advent")).toThrow(new RegExp(field));
  });

  it.each(["tooShort", "4WYNBjJSYvE?x=1", "../../abcdefg"])("refuses the video id %s", (id) => {
    const bad = source.replace("4WYNBjJSYvE", `"${id}"`);
    expect(() => parseVideoSeries(bad, "advent")).toThrow(/youtubeId/);
  });

  it("refuses a source link that is not a BibleProject video page", () => {
    const bad = source.replace("https://bibleproject.com/videos/yakhal", "https://example.com/x");
    expect(() => parseVideoSeries(bad, "advent")).toThrow(/sourceUrl/);
  });

  it("refuses videos whose weeks are out of order", () => {
    const bad = source.replace("2026-12-06", "2026-11-20");
    expect(() => parseVideoSeries(bad, "advent")).toThrow(/order/);
  });
});

describe("the Advent series file", () => {
  const advent = loadVideoSeries("advent");

  it("holds the four checked videos in week order", () => {
    expect(advent.videos.map((v) => [v.week, v.from, v.youtubeId])).toEqual([
      ["hope", "2026-11-29", "4WYNBjJSYvE"],
      ["peace", "2026-12-06", "oLYORLZOaZE"],
      ["joy", "2026-12-13", "qvOhQTuD2e0"],
      ["love", "2026-12-20", "slyevQ1LW7A"],
    ]);
  });

  it("adds up to about 18 minutes", () => {
    expect(totalMinutes(advent)).toBe(18);
  });

  it.each([
    ["2026-11-28", "hope", null],
    ["2026-11-29", "hope", "hope"],
    ["2026-12-05", "hope", "hope"],
    ["2026-12-06", "peace", "peace"],
    ["2026-12-12", "peace", "peace"],
    ["2026-12-13", "joy", "joy"],
    ["2026-12-19", "joy", "joy"],
    ["2026-12-20", "love", "love"],
    ["2026-12-26", "love", "love"],
    ["2026-12-27", null, null],
  ])("on %s opens %s and labels %s as this week", (today, open, current) => {
    expect(weekState(advent, today)).toEqual({ open, current });
  });

  it("opens the week named in the address, and keeps this week's label", () => {
    expect(weekState(advent, "2026-12-06", "joy")).toEqual({ open: "joy", current: "peace" });
    expect(weekState(advent, "2026-12-27", "joy")).toEqual({ open: "joy", current: null });
  });

  it.each([["easter"], ["Joy"], [""], [["joy", "love"]], [undefined]])(
    "treats ?week=%j as no choice",
    (requested) => {
      expect(weekState(advent, "2026-12-06", requested)).toEqual({
        open: "peace",
        current: "peace",
      });
    },
  );
});
