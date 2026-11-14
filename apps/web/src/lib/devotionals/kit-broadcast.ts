import { devotionalEmailHtml, type EmailSeries } from "./email.ts";
import type { Devotional } from "./parse.ts";
import { type Series, seriesPosition } from "./series.ts";

const KIT_URL = "https://api.kit.com/v4";

/** The public contact address, as in the footer and the Kit account's default sender. */
export const BROADCAST_SENDER = "hello@wordonthewater.net";

/** The email-sized banner in each series folder (1200 px wide, under 100 KB). */
export const EMAIL_ART = "art-night-swell-email.jpg";

/**
 * Where email images are fetched from: the public repository, which works before the site is live.
 * At launch this moves to the site's own content address (production_checklist.md).
 */
export const SERIES_IMAGE_BASE =
  "https://raw.githubusercontent.com/thecodeblock-hendrik/word-on-the-water/main/apps/web/content/series";

/** The series line and header image for a devotional's email. */
export function emailSeries(
  series: Series,
  number: number,
  imageBase: string = SERIES_IMAGE_BASE,
): EmailSeries {
  return {
    position: seriesPosition(series, number),
    image: { url: `${imageBase}/${series.slug}/${EMAIL_ART}`, alt: series.artAlt },
  };
}

/** A tag id, or "all" for every subscriber on purpose: there is no default audience. */
export type Audience = { tag: number } | "all";

export type BroadcastDraft = ReturnType<typeof broadcastDraft>;

/** The audience from the command line: `--tag <id>` or `--all`, never a silent default. */
export function audienceFromArgs({ tag, all }: { tag?: string; all?: boolean }): Audience {
  if (tag !== undefined && all) throw new Error("Give --tag <id> or --all, not both.");
  if (all) return "all";
  if (tag === undefined) throw new Error("Choose the audience: --tag <id> or --all.");
  if (!/^[1-9]\d*$/.test(tag)) throw new Error(`--tag must be a whole number, but is "${tag}".`);
  return { tag: Number(tag) };
}

/**
 * The Kit broadcast fields for a devotional. Always a draft (never scheduled, never public).
 * Kit fills in anything left out and resets what an update leaves out, so every field is sent
 * (2.4 spike, ADR 0008). The weekly email is scheduled by a person in Kit.
 */
export function broadcastDraft(
  devotional: Devotional,
  { siteUrl, audience, series }: { siteUrl: string; audience: Audience; series?: EmailSeries },
) {
  const filter =
    audience === "all" ? { type: "all_subscribers" } : { type: "tag", ids: [audience.tag] };
  return {
    subject: devotional.meta.emailSubject,
    preview_text: devotional.meta.summary,
    description: `Devotional: ${devotional.slug}`,
    content: devotionalEmailHtml(devotional, { siteUrl, series }),
    email_address: BROADCAST_SENDER,
    public: false,
    send_at: null,
    subscriber_filter: [{ all: [filter] }],
  };
}

/** Create the draft in Kit and return its id. Errors carry the status only, never the key or text. */
export async function createBroadcastDraft(
  draft: BroadcastDraft,
  apiKey: string,
  fetchKit: typeof fetch = fetch,
): Promise<number> {
  const response = await fetchKit(`${KIT_URL}/broadcasts`, {
    method: "POST",
    headers: { "X-Kit-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (response.status === 429) {
    throw new Error("Kit is rate limiting this key (status 429). Try again in a minute.");
  }
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Kit rejected the draft with status ${response.status}.`);
  }
  const { broadcast } = (await response.json()) as { broadcast: { id: number } };
  return broadcast.id;
}
