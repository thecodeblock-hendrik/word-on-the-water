import { describe, expect, it, vi } from "vitest";

import { devotionalEmailHtml } from "@/lib/devotionals/email";
import {
  BROADCAST_SENDER,
  broadcastDraft,
  createBroadcastDraft,
} from "@/lib/devotionals/kit-broadcast";
import { loadDevotionals } from "@/lib/devotionals/load";

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
