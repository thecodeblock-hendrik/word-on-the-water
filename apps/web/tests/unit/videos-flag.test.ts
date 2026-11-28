import { describe, expect, it } from "vitest";

import { isVideosEnabled } from "@/lib/videos/flag";

describe("isVideosEnabled", () => {
  it("is off unless VIDEOS_ENABLED is exactly 1", () => {
    expect(isVideosEnabled({})).toBe(false);
    expect(isVideosEnabled({ VIDEOS_ENABLED: "" })).toBe(false);
    expect(isVideosEnabled({ VIDEOS_ENABLED: "0" })).toBe(false);
    expect(isVideosEnabled({ VIDEOS_ENABLED: "true" })).toBe(false);
    expect(isVideosEnabled({ VIDEOS_ENABLED: "1" })).toBe(true);
  });
});
