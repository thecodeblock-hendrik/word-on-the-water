import { describe, expect, it } from "vitest";

import { devotionalEmailHtml } from "@/lib/devotionals/email";
import type { Devotional } from "@/lib/devotionals/parse";
import { ESV_NOTICE } from "@/lib/scripture";

const SITE = "https://wordonthewater.net";

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

const html = (d = devotional()) => devotionalEmailHtml(d, { siteUrl: SITE });

describe("devotionalEmailHtml", () => {
  it("starts with the title and lists the sections in the site's order", () => {
    const out = html();
    expect(out).toMatch(/^<h1[^>]*>More Than Watchmen<\/h1>/);
    const headings = [...out.matchAll(/<h2[^>]*>(.+?)<\/h2>/g)].map((m) => m[1]);
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
    expect(out).toContain("<p>The alarm goes at 4:40.</p>");
    expect(out).toContain("<p>Second paragraph.</p>");
    expect(out).toContain("<em>more than watchmen</em>");
    expect(out).toContain("<strong>morning</strong>");
  });

  it("styles pull quotes inline, because Kit's template drops blockquote styling", () => {
    expect(html()).toMatch(
      /<blockquote style="[^"]*border-left:[^"]*">Pulled line\.<\/blockquote>/,
    );
  });

  it("shows the scripture with verse numbers as superscripts and its reference", () => {
    const out = html();
    expect(out).toMatch(/<blockquote style="[^"]*">/);
    expect(out).toContain("<sup>5</sup>I wait for the ");
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
    expect(out).toContain("<p><strong>Talk it over</strong><br>What darkness?</p>");
    expect(out).toContain("<p><strong>Read further</strong><br>Psalm 130.</p>");
  });

  it("links to the devotional on the website and carries the ESV notice", () => {
    const out = html();
    expect(out).toContain(`href="${SITE}/devotionals/advent-01-more-than-watchmen"`);
    expect(out).toContain(ESV_NOTICE);
  });

  it("escapes everything: text is never treated as HTML", () => {
    const out = html(devotional({ "The Lineup": 'Tom & <script>alert(1)</script> "quoted"' }));
    expect(out).not.toContain("<script>");
    expect(out).toContain("Tom &amp; &lt;script&gt;alert(1)&lt;/script&gt; &quot;quoted&quot;");
  });

  it("leaves the unsubscribe link and address to Kit, which adds them itself", () => {
    expect(html().toLowerCase()).not.toContain("unsubscribe");
  });

  it("is a fragment: Kit wraps it in the page", () => {
    expect(html()).not.toMatch(/<html|<body|<head/);
  });
});
