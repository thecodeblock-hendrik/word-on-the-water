import { describe, expect, it } from "vitest";

import { devotionalEmailHtml } from "@/lib/devotionals/email";
import type { Devotional } from "@/lib/devotionals/parse";
import { ESV_NOTICE } from "@/lib/scripture";

const SITE = "https://wordonthewater.net";
const IMAGE = "https://example.test/series/advent/art-night-swell-email.jpg";
const SERIES = {
  position: "Advent · 1 of 5",
  image: { url: IMAGE, alt: "A lighthouse at night." },
};

function devotional(overrides: Partial<Record<string, string>> = {}): Devotional {
  const sections = {
    "The Lineup": "The alarm goes at 4:40.\n\nSecond paragraph.",
    "The Word": "He waits *more than watchmen* for the **morning**.\n\n> Pulled line.",
    "Paddle Out": "Sit in the dark.",
    Pray: "I wait for the LORD, my soul waits. Amen.",
    "Go Deeper": "**Talk it over:** What darkness?\n\n**Read further:** Psalm 130.",
    ...overrides,
  };
  return {
    slug: "advent-01-more-than-watchmen",
    readMinutes: 4,
    sections: Object.entries(sections).map(([heading, markdown]) => ({ heading, markdown })),
    meta: {
      title: "More Than Watchmen",
      publishAt: "2026-12-05",
      author: "H",
      series: "advent",
      seriesNumber: 1,
      passages: ["Psalm 130:5–6"],
      summary: "Every dawn patrol starts in the dark.",
      emailSubject: "Waiting for first light",
      tags: ["Advent"],
      conditions: [{ text: "^5^I wait for the LORD, my soul waits.", ref: "Psalm 130:5–6 (ESV)" }],
      reportConditions: "Dark, light coming",
      keyVerse: { text: "My soul waits.", ref: "Psalm 130:6 (ESV)" },
      imageAlt: "Surfers waiting.",
    },
  };
}

const html = (
  d = devotional(),
  series: Parameters<typeof devotionalEmailHtml>[1]["series"] = SERIES,
) => devotionalEmailHtml(d, { siteUrl: SITE, series });

/** A tag with any inline style, then the given inner text: `<p style="...">text</p>`. */
const styled = (tag: string, inner: string) =>
  new RegExp(`<${tag} style="[^"]*">${inner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</${tag}>`);

describe("the dark look (Night swell)", () => {
  it("sits in a full-width dark table with an explicit background, which Outlook and Gmail respect", () => {
    const out = html();
    expect(out).toMatch(/^<table [^>]*bgcolor="#0f2233"[^>]*style="[^"]*background:#0f2233/);
    expect(out).toContain("color:#f4f1ea");
  });

  it("puts the series image first, full width, with its alt text", () => {
    const out = html();
    expect(out).toMatch(
      new RegExp(
        `<img src="${IMAGE}" alt="A lighthouse at night\\." width="600" style="[^"]*display:block[^"]*">`,
      ),
    );
    expect(out.indexOf("<img")).toBeLessThan(out.indexOf("<h1"));
  });

  it("shows the series position above the title, then the title", () => {
    const out = html();
    expect(out).toMatch(styled("p", "Advent · 1 of 5"));
    expect(out).toMatch(styled("h1", "More Than Watchmen"));
    expect(out.indexOf("Advent · 1 of 5")).toBeLessThan(out.indexOf("More Than Watchmen"));
  });

  it("works without a series image or position (a new series with no email art yet)", () => {
    const out = devotionalEmailHtml(devotional(), { siteUrl: SITE });
    expect(out).not.toContain("<img");
    expect(out).toMatch(styled("h1", "More Than Watchmen"));
  });

  it("puts Paddle Out in the darker panel, as the site does", () => {
    const out = html();
    expect(out).toMatch(
      /<table [^>]*bgcolor="#0a1825"[^>]*>[\s\S]*Paddle Out[\s\S]*Sit in the dark\./,
    );
  });
});

describe("devotionalEmailHtml", () => {
  it("lists the sections in the site's order", () => {
    const headings = [...html().matchAll(/<h2[^>]*>(.+?)<\/h2>/g)].map((m) => m[1]);
    expect(headings).toEqual([
      "Conditions",
      "The Lineup",
      "The Word",
      "Paddle Out",
      "Pray",
      "Go Deeper",
    ]);
  });

  it("leaves Go Deeper out when the devotional has none", () => {
    const d = devotional();
    d.sections = d.sections.filter((s) => s.heading !== "Go Deeper");
    expect(html(d)).not.toContain("Go Deeper");
  });

  it("turns paragraphs into <p> and bold and italic into <strong> and <em>", () => {
    const out = html();
    expect(out).toMatch(styled("p", "The alarm goes at 4:40."));
    expect(out).toMatch(styled("p", "Second paragraph."));
    expect(out).toContain("<em>more than watchmen</em>");
    expect(out).toContain("<strong>morning</strong>");
  });

  it("styles pull quotes inline, because Kit's template drops blockquote styling", () => {
    expect(html()).toMatch(
      /<blockquote style="[^"]*border-left:3px solid #4fa9a6[^"]*">Pulled line\.<\/blockquote>/,
    );
  });

  it("shows the scripture on a raised panel with verse numbers as superscripts and its reference", () => {
    const out = html();
    expect(out).toMatch(/<blockquote style="[^"]*background:#152c40[^"]*">/);
    expect(out).toMatch(/<sup style="[^"]*">5<\/sup>I wait for the /);
    expect(out).toContain("Psalm 130:5–6 (ESV)");
  });

  it("shows LORD in small capitals as Lord", () => {
    expect(html()).toContain('<span style="font-variant:small-caps">Lord</span>');
    expect(html()).not.toContain("LORD");
  });

  it("styles the closing Amen apart from the prayer", () => {
    expect(html()).toMatch(/<span style="[^"]*">Amen\.<\/span>/);
  });

  it("writes each Go Deeper item as a bold label and its text", () => {
    const out = html();
    expect(out).toMatch(
      /<p style="[^"]*"><strong[^>]*>Talk it over<\/strong><br>What darkness\?<\/p>/,
    );
    expect(out).toMatch(/<p style="[^"]*"><strong[^>]*>Read further<\/strong><br>Psalm 130\.<\/p>/);
  });

  it("links to the devotional on the website and carries the ESV notice", () => {
    const out = html();
    expect(out).toContain(`href="${SITE}/devotionals/advent-01-more-than-watchmen"`);
    expect(out).toContain(ESV_NOTICE);
  });

  it("escapes everything: text and alt text are never treated as HTML", () => {
    const out = html(devotional({ "The Lineup": 'Tom & <script>alert(1)</script> "quoted"' }), {
      position: "A & B",
      image: { url: IMAGE, alt: 'He said "<b>hi</b>"' },
    });
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<b>hi</b>");
    expect(out).toContain("Tom &amp; &lt;script&gt;alert(1)&lt;/script&gt; &quot;quoted&quot;");
    expect(out).toContain('alt="He said &quot;&lt;b&gt;hi&lt;/b&gt;&quot;"');
    expect(out).toContain("A &amp; B");
  });

  it("leaves the unsubscribe link and address to Kit, which adds them itself", () => {
    expect(html().toLowerCase()).not.toContain("unsubscribe");
  });

  it("is a fragment: Kit wraps it in the page", () => {
    expect(html()).not.toMatch(/<html|<body|<head/);
  });
});
