import { afterEach, describe, expect, it, vi } from "vitest";

import { today } from "@/lib/devotionals/format";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("today", () => {
  it("is the real date in UTC by default", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-12T01:30:00Z"));
    expect(today()).toBe("2026-12-12");
  });

  it("can be set with DEVOTIONAL_TODAY, to see how the site looks on another day", () => {
    vi.stubEnv("DEVOTIONAL_TODAY", "2026-12-19");
    expect(today()).toBe("2026-12-19");
  });

  it("ignores DEVOTIONAL_TODAY on the production site", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-05T08:00:00Z"));
    vi.stubEnv("DEVOTIONAL_TODAY", "2027-06-01");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(today()).toBe("2026-12-05");
  });

  it("still honours DEVOTIONAL_TODAY on preview deployments", () => {
    vi.stubEnv("DEVOTIONAL_TODAY", "2026-12-19");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(today()).toBe("2026-12-19");
  });

  it("rejects a malformed DEVOTIONAL_TODAY instead of guessing", () => {
    vi.stubEnv("DEVOTIONAL_TODAY", "12 December");
    expect(() => today()).toThrow(/DEVOTIONAL_TODAY/);
  });
});
