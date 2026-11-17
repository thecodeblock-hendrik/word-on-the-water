import { devotionalEmailHtml, type EmailSeries } from "./email.ts";
import type { Devotional } from "./parse.ts";
import { type Series, seriesPosition } from "./series.ts";

const KIT_URL = "https://api.kit.com/v4";

/** The public contact address, as in the footer and the Kit account's default sender. */
export const BROADCAST_SENDER = "hello@wordonthewater.net";

/**
 * Where email images are fetched from: plain files in apps/web/public/email, served by the live
 * site at a fixed address. An email lives in inboxes for years, so an image address must never
 * move or change: no branch, no hash, and a changed banner gets a new file name.
 */
export const EMAIL_IMAGE_BASE = "https://wordonthewater.net/email";

/** The series line and, when the series has an email banner, its header image. */
export function emailSeries(
  series: Series,
  number: number,
  imageBase: string = EMAIL_IMAGE_BASE,
): EmailSeries {
  const position = seriesPosition(series, number);
  if (!series.emailBanner) return { position };
  return { position, image: { url: `${imageBase}/${series.emailBanner}`, alt: series.artAlt } };
}

/**
 * Stops a draft whose banner would not show: an email cannot be fixed after it is sent. Run before
 * the draft is created, so a missing or unmerged image fails here and not in a reader's inbox.
 */
export async function checkBannerReachable(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl(url, { method: "HEAD" });
  } catch {
    throw new Error(`The email banner could not be reached at ${url}. Is the site live?`);
  }
  if (!response.ok) {
    throw new Error(
      `The email banner at ${url} answered ${response.status}. Merge and deploy the banner first.`,
    );
  }
  if (!response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error(`The email banner at ${url} is not an image (it answered with another type).`);
  }
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
