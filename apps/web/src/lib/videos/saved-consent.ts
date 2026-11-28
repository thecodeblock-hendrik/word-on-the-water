import "server-only";

import { cookies } from "next/headers";

import { VIDEO_CONSENT_COOKIE, parseVideoConsent } from "./consent";

/** The choice this visitor saved, if any. */
export async function savedVideoConsent() {
  return parseVideoConsent((await cookies()).get(VIDEO_CONSENT_COOKIE)?.value);
}
