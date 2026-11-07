import { DEFAULT_VERSION, findVersion } from "./versions.ts";

export const VERSION_COOKIE = "bible-version";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** The remembered version if it is one we offer and have turned on, otherwise the default. */
export function parseVersion(value: string | undefined): string {
  return value && findVersion(value)?.enabled ? value : DEFAULT_VERSION;
}

/** A first-party preference cookie, like the theme one: Lax, a year, Secure only over https. */
export function versionCookie(id: string, secure: boolean): string {
  return `${VERSION_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
