import { describe, expect, it, vi } from "vitest";

import { devotionalEmailHtml } from "@/lib/devotionals/email";
import {
  audienceFromArgs,
  BROADCAST_SENDER,
  broadcastDraft,
  createBroadcastDraft,
  EMAIL_ART,
  emailSeries,
  SERIES_IMAGE_BASE,
} from "@/lib/devotionals/kit-broadcast";
import { loadDevotionals } from "@/lib/devotionals/load";
import { loadSeries } from "@/lib/devotionals/series-load";

const SITE = "https://wordonthewater.net";
const KEY = "kit-secret-key";
const [devotional] = loadDevotionals();

const draft = (audience: Parameters<typeof broadcastDraft>[1]["audience"] = { tag: 555 }) =>
  broadcastDraft(devotional, { siteUrl: SITE, audience });

describe("broadcastDraft", () => {
  it("maps the devotional to the full set of Kit fields, as a draft that is never scheduled", () => {
    expect(draft()).toEqual({
      subject: devotional.meta.emailSubject,
      preview_text: devotional.meta.summary,
      description: `Devotional: ${devotional.slug}`,
      content: devotionalEmailHtml(devotional, { siteUrl: SITE }),
      email_address: BROADCAST_SENDER,
      public: false,
      send_at: null,
      subscriber_filter: [{ all: [{ type: "tag", ids: [555] }] }],
    });
  });

  it("names all subscribers only when asked to, and says so in the filter", () => {
    expect(draft("all").subscriber_filter).toEqual([{ all: [{ type: "all_subscribers" }] }]);
  });
});

function fakeKit(status: number, body: unknown = { broadcast: { id: 27039164 } }) {
  return vi.fn<typeof fetch>(async () => Response.json(body, { status }));
}

describe("createBroadcastDraft", () => {
  it("posts the draft to Kit with the key and returns the new broadcast id", async () => {
    const kit = fakeKit(201);
    const id = await createBroadcastDraft(draft(), KEY, kit);

    const [url, init] = kit.mock.calls[0];
    expect(id).toBe(27039164);
    expect(url).toBe("https://api.kit.com/v4/broadcasts");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("x-kit-api-key")).toBe(KEY);
    expect(JSON.parse(init?.body as string)).toEqual(draft());
  });

  it.each([401, 422, 500])(
    "fails on status %i without the key or the content in the message",
    async (status) => {
      const error = await createBroadcastDraft(draft(), KEY, fakeKit(status)).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain(String(status));
      expect(error.message).not.toContain(KEY);
      expect(error.message).not.toContain(devotional.meta.title);
    },
  );

  it("says when Kit is rate limiting so the run can simply be repeated later", async () => {
    await expect(createBroadcastDraft(draft(), KEY, fakeKit(429))).rejects.toThrow(/rate limit/i);
  });
});

describe("audienceFromArgs", () => {
  it("takes a tag id or --all", () => {
    expect(audienceFromArgs({ tag: "555" })).toEqual({ tag: 555 });
    expect(audienceFromArgs({ all: true })).toBe("all");
  });

  it("refuses to guess: one of the two must be given, not both", () => {
    expect(() => audienceFromArgs({})).toThrow(/--tag <id> or --all/);
    expect(() => audienceFromArgs({ tag: "555", all: true })).toThrow(/not both/);
  });

  it.each(["abc", "0", "-3", "5.5"])("rejects the tag %s", (tag) => {
    expect(() => audienceFromArgs({ tag })).toThrow(/whole number/);
  });
});

describe("emailSeries", () => {
  const [advent] = loadSeries();

  it("gives the series line, the email image address and the art's alt text", () => {
    expect(emailSeries(advent, 1)).toEqual({
      position: "Advent · 1 of 5",
      image: { url: `${SERIES_IMAGE_BASE}/advent/${EMAIL_ART}`, alt: advent.artAlt },
    });
  });

  it("takes another image base, for a preview branch or the live site", () => {
    expect(emailSeries(advent, 2, "https://example.test/s").image?.url).toBe(
      `https://example.test/s/advent/${EMAIL_ART}`,
    );
  });

  it("puts the series header into the draft's content", () => {
    const series = emailSeries(advent, 1);
    const withSeries = broadcastDraft(devotional, { siteUrl: SITE, audience: "all", series });
    expect(withSeries.content).toBe(devotionalEmailHtml(devotional, { siteUrl: SITE, series }));
    expect(withSeries.content).toContain(series.image!.url);
  });
});
