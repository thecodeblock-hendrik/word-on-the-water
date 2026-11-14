import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEVOTIONALS_DIR, loadContent } from "@/lib/devotionals/load";
import { parseDevotional } from "@/lib/devotionals/parse";
import { parseSeries } from "@/lib/devotionals/series";

describe("devotional content in the repo", () => {
  it("every devotional is valid and has its verse cards", () => {
    expect(loadContent().devotionals.length).toBeGreaterThan(0);
  });

  it("the launch devotional is More Than Watchmen on Saturday 28 November 2026", () => {
    const first = loadContent().devotionals.at(-1)!;
    expect(first.meta.title).toBe("More Than Watchmen");
    expect(first.meta.publishAt).toBe("2026-11-28");
    expect(new Date(`${first.meta.publishAt}T00:00:00Z`).getUTCDay()).toBe(6);
    expect(first.readMinutes).toBeGreaterThanOrEqual(2);
  });

  it("the template stays valid, so copying it works", () => {
    const source = readFileSync(join(DEVOTIONALS_DIR, "_template", "devotional.md"), "utf8");
    expect(() => parseDevotional(source, "_template")).not.toThrow();
  });

  it("the series template stays valid, so copying it works", () => {
    const source = readFileSync(
      join(DEVOTIONALS_DIR, "..", "series", "_template", "series.yml"),
      "utf8",
    );
    expect(() => parseSeries(source, "_template")).not.toThrow();
  });
});
