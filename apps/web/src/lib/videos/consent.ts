/** Whether the visitor accepted YouTube on the video pages. */
export const VIDEO_CONSENT_COOKIE = "youtube-consent";

export type VideoConsent = "yes" | "no";

/** The window event that asks the banner to open again ("Cookie settings"). */
export const OPEN_VIDEO_CONSENT = "video-consent:open";

/** Returns the choice if the value is a valid one, otherwise undefined (not asked yet). */
export function parseVideoConsent(value: unknown): VideoConsent | undefined {
  return value === "yes" || value === "no" ? value : undefined;
}
