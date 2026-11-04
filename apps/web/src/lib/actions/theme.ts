"use server";

import { cookies, headers } from "next/headers";

import { THEME_COOKIE, parseTheme } from "@/lib/theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Remember the reader's theme so the server renders it without a flash. Secure only over https. */
export async function setTheme(value: string): Promise<void> {
  const theme = parseTheme(value);
  if (!theme) return;
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: ONE_YEAR,
  });
}
