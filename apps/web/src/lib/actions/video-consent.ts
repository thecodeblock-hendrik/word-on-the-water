"use server";

import { cookies, headers } from "next/headers";

import { VIDEO_CONSENT_COOKIE, type VideoConsent, parseVideoConsent } from "@/lib/videos/consent";

const SIX_MONTHS = 60 * 60 * 24 * 182;

/** Keep the choice in a first-party cookie, so the server knows it. Secure only over https. */
async function remember(choice: VideoConsent): Promise<void> {
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  const store = await cookies();
  store.set(VIDEO_CONSENT_COOKIE, choice, {
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: SIX_MONTHS,
  });
}

/** The banner's Decline and Accept buttons. A plain form post, so it works without JavaScript. */
export async function saveVideoConsent(form: FormData): Promise<void> {
  const choice = parseVideoConsent(form.get("choice"));
  if (choice) await remember(choice);
}

/** "Allow and play", pressed in a video's place. */
export async function allowVideos(): Promise<void> {
  await remember("yes");
}
