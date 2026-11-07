import { describe, expect, it } from "vitest";

import { isBibleEnabled } from "@/lib/bible/flag";

describe("isBibleEnabled", () => {
  it("is off unless BIBLE_ENABLED is exactly 1", () => {
    expect(isBibleEnabled({})).toBe(false);
    expect(isBibleEnabled({ BIBLE_ENABLED: "" })).toBe(false);
    expect(isBibleEnabled({ BIBLE_ENABLED: "0" })).toBe(false);
    expect(isBibleEnabled({ BIBLE_ENABLED: "true" })).toBe(false);
    expect(isBibleEnabled({ BIBLE_ENABLED: "1" })).toBe(true);
  });

  it("reads the process environment by default", () => {
    const before = process.env.BIBLE_ENABLED;
    process.env.BIBLE_ENABLED = "1";
    expect(isBibleEnabled()).toBe(true);
    delete process.env.BIBLE_ENABLED;
    expect(isBibleEnabled()).toBe(false);
    if (before !== undefined) process.env.BIBLE_ENABLED = before;
  });
});
