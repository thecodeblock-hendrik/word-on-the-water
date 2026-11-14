import { afterEach, describe, expect, it, vi } from "vitest";

// connection() only works inside a request; the sitemap awaits it so it is not cached at build time.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { absoluteUrl, SITE_URL } from "@/lib/site";

afterEach(() => vi.unstubAllEnvs());

const urls = async (today: string) => {
  vi.stubEnv("DEVOTIONAL_TODAY", today);
  return (await sitemap()).map((entry) => entry.url);
};

describe("the site address", () => {
  it("is the production domain, and builds absolute addresses from it", () => {
    expect(SITE_URL).toBe("https://wordonthewater.net");
    expect(absoluteUrl("/")).toBe("https://wordonthewater.net/");
    expect(absoluteUrl("/devotionals/x")).toBe("https://wordonthewater.net/devotionals/x");
  });
});

describe("robots.txt", () => {
  it("lets crawlers read the site but not the API routes, and names the sitemap", () => {
    const { rules, sitemap: map } = robots();
    const rule = Array.isArray(rules) ? rules[0] : rules;
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual(["/api/"]);
    expect(map).toBe("https://wordonthewater.net/sitemap.xml");
  });
});

describe("sitemap.xml", () => {
  const home = "https://wordonthewater.net/";
  const week = (slug: string) => `https://wordonthewater.net/devotionals/${slug}`;

  it("lists the home page and only the launch devotional before anything else is published", async () => {
    expect(await urls("2026-11-14")).toEqual([home, week("advent-01-more-than-watchmen")]);
  });

  it("grows by one devotional on each publish day, with no redeploy", async () => {
    expect(await urls("2026-11-28")).toEqual([home, week("advent-01-more-than-watchmen")]);
    expect(await urls("2026-12-04")).toEqual([home, week("advent-01-more-than-watchmen")]);
    expect(await urls("2026-12-05")).toEqual([
      home,
      week("advent-02-the-long-wait"),
      week("advent-01-more-than-watchmen"),
    ]);
  });

  it("lists every published devotional once the series is out, newest first", async () => {
    expect(await urls("2026-12-21")).toEqual([
      home,
      week("advent-04-shepherds-on-the-night-shift"),
      week("advent-03-a-quiet-mans-yes"),
      week("advent-02-the-long-wait"),
      week("advent-01-more-than-watchmen"),
    ]);
  });

  it("never lists the thank-you page or API routes, and every address is absolute", async () => {
    const all = await urls("2026-12-21");
    expect(all.some((url) => /thank-you|\/api\//.test(url))).toBe(false);
    expect(all.every((url) => url.startsWith("https://wordonthewater.net/"))).toBe(true);
  });

  it("dates each devotional by its publish day and the home page by the newest one", async () => {
    vi.stubEnv("DEVOTIONAL_TODAY", "2026-12-12");
    const entries = await sitemap();
    expect(entries[0].lastModified).toBe("2026-12-12");
    expect(entries.find((e) => e.url.endsWith("advent-02-the-long-wait"))?.lastModified).toBe(
      "2026-12-05",
    );
  });
});
