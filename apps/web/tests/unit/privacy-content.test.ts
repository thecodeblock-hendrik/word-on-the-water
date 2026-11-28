import { describe, expect, it } from "vitest";

import { PRIVACY_UPDATED, privacyPolicy, privacyUpdated } from "@/content/privacy";
import { findPlaceholders } from "@/lib/placeholders";

const policy = (bibleEnabled = false) => privacyPolicy({ bibleEnabled });
const everything = (bibleEnabled = false) => JSON.stringify(policy(bibleEnabled));
const section = (id: string, bibleEnabled = false) =>
  policy(bibleEnabled).sections.find((s) => s.id === id)!;
const terms = (id: string, bibleEnabled = false) =>
  section(id, bibleEnabled).items!.map((item) => item.term);

describe("the privacy policy content", () => {
  it("carries the date it was last updated", () => {
    expect(PRIVACY_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(PRIVACY_UPDATED))).toBe(false);
  });

  it("has these sections, in this order, each with a heading and something to read", () => {
    const { sections } = policy();
    expect(sections.map((s) => s.id)).toEqual([
      "who-we-are",
      "what-we-collect",
      "cookies",
      "how-long",
      "who-else",
      "your-rights",
      "children",
      "changes",
      "contact",
    ]);
    for (const s of sections) {
      expect(s.heading.length).toBeGreaterThan(0);
      expect((s.paragraphs?.length ?? 0) + (s.items?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it("says what is collected: the sign-up, the bot check, abuse keys, logs, analytics, errors, email", () => {
    expect(terms("what-we-collect")).toEqual([
      "The weekly email",
      "Checking you are a person",
      "Stopping abuse",
      "Running the site",
      "Counting visits",
      "Fixing errors",
      "Emails you send us",
    ]);
  });

  it("names every service that handles personal data", () => {
    expect(terms("who-else")).toEqual([
      "Kit",
      "Vercel",
      "Neon",
      "Upstash",
      "Cloudflare",
      "Sentry",
      "Squarespace",
      "Google",
    ]);
  });

  it("says where Sentry and Upstash keep data: the EU and Frankfurt", () => {
    const text = (term: string) => section("who-else").items!.find((i) => i.term === term)!.text;
    expect(text("Sentry")).toMatch(/EU/);
    expect(text("Upstash")).toMatch(/Frankfurt/);
  });

  it("states the retention the job enforces: 7 days unconfirmed, 30 days of backups", () => {
    const kept = JSON.stringify(section("how-long"));
    expect(kept).toContain("7 days");
    expect(kept).toContain("30 days");
  });

  it("names the theme cookie, and the Bible cookies only when the Bible reader is switched on", () => {
    expect(terms("cookies", false)).toEqual(["theme"]);
    expect(terms("cookies", true)).toEqual(["theme", "bible-version and bible-passage"]);
  });

  it("promises no tracking and no selling, and that children are not the audience", () => {
    const all = everything().toLowerCase();
    expect(all).toContain("no advertising or tracking cookies");
    expect(all).toContain("never sell");
    expect(JSON.stringify(section("children"))).toMatch(/not aimed at children/);
  });

  it("gives a way to reach us, and the regulators a person can complain to", () => {
    expect(JSON.stringify(section("contact"))).toContain("hello@wordonthewater.net");
    const rights = JSON.stringify(section("your-rights"));
    expect(rights).toContain("Information Regulator");
    expect(rights).toMatch(/30 days/);
  });

  it("does not describe things that do not exist yet: the prayer and contact forms, Postmark", () => {
    const all = everything(true).toLowerCase();
    for (const word of ["postmark", "prayer request form", "prayer form", "contact form"]) {
      expect(all, word).not.toContain(word);
    }
  });

  it("does not mention a prayer address (the prayer feature comes after launch)", () => {
    expect(everything(true).toLowerCase()).not.toContain("prayer");
  });

  it("names the registered name that runs the site, not a person, and gives the postal address", () => {
    const who = JSON.stringify(section("who-we-are"));
    expect(who).toContain("run by Word On The Water, the registered name of the ministry");
    expect(who).not.toContain("Oosthuizen");
    expect(JSON.stringify(section("contact"))).toContain(
      "PO Box 6055, Port Elizabeth, Eastern Cape 6001",
    );
  });

  it("has no [placeholder] left, so the launch check has nothing to stop on", () => {
    expect(findPlaceholders(policy(true))).toEqual([]);
  });
});

describe("the Ask the Word chat in the policy", () => {
  const withChat = privacyPolicy({ bibleEnabled: false, chatEnabled: true });
  const item = withChat.sections
    .find((s) => s.id === "what-we-collect")!
    .items!.find((i) => i.term === "Ask the Word chat");

  it("is described only while the chat is switched on", () => {
    expect(item).toBeDefined();
    expect(everything()).not.toContain("Ask the Word");
  });

  it("says nothing is stored or shared, the tab keeps the thread and personal details are refused", () => {
    expect(item!.text).toMatch(/not stored/i);
    expect(item!.text).toMatch(/not .*(sent|shared)|no one else/i);
    expect(item!.text).toMatch(/browser tab/i);
    expect(item!.text).toMatch(/personal details/i);
  });

  it("has no draft placeholders", () => {
    expect(findPlaceholders(withChat)).toEqual([]);
  });
});

describe("the videos in the policy", () => {
  const withVideos = privacyPolicy({ bibleEnabled: false, videosEnabled: true });
  const part = (id: string) => withVideos.sections.find((s) => s.id === id)!;
  const item = part("what-we-collect").items!.find((i) => i.term === "Watching videos");
  const text = item?.text ?? "";

  it("changes nothing, text or date, while videos are off", () => {
    expect(privacyPolicy({ bibleEnabled: false, videosEnabled: false })).toEqual(policy());
    expect(everything()).not.toMatch(/video|YouTube/i);
    expect(privacyUpdated(false)).toBe(PRIVACY_UPDATED);
    expect(privacyUpdated(true) > PRIVACY_UPDATED).toBe(true);
  });

  it("says nothing is sent before play, then what Google receives and may store", () => {
    expect(text).toMatch(/opening them sends nothing to YouTube or Google/);
    expect(text).toMatch(/press play/i);
    expect(text).toMatch(/Google/);
    expect(text).toMatch(/IP address/);
    expect(text).toMatch(/browser and device/);
    expect(text).toMatch(/may set cookies or store/);
    expect(text).toMatch(/advertising/);
    expect(text).toContain("youtube-nocookie.com");
    expect(text).toMatch(/add no tracking of our own to the videos/);
  });

  it("has what YouTube asks of a site that embeds its player", () => {
    expect(text).toContain("YouTube API Services");
    expect(text).toMatch(/agree to be bound by the YouTube Terms of Service/);
    expect(text).toContain("https://www.youtube.com/t/terms");
    expect(text).toContain("https://www.google.com/policies/privacy");
  });

  it("lists YouTube as a service that does not act only for us", () => {
    const who = part("who-else");
    expect(who.items!.at(-1)!.term).toBe("YouTube (Google)");
    expect(who.items!.at(-1)!.text).toMatch(/only if you press play/i);
    expect(who.paragraphs!.join(" ")).toMatch(/only for us, except YouTube/);
  });

  it("does not claim there are no cookies, or that no cookie banner is needed", () => {
    const cookies = JSON.stringify(part("cookies"));
    expect(cookies).toContain("no advertising or tracking cookies of our own");
    expect(cookies).toMatch(/YouTube may set cookies/);
    expect(cookies).not.toMatch(/The only cookies|no cookie banner/);
  });

  it("has no draft placeholders", () => {
    expect(findPlaceholders(withVideos)).toEqual([]);
  });
});
