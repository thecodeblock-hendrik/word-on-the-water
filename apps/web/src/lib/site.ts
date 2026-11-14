/**
 * The public address of the site, for canonical links, the sitemap and social previews. The same
 * SITE_URL setting as the API; unset, it is the production domain (previews are behind a login).
 */
export const SITE_URL = (process.env.SITE_URL || "https://wordonthewater.net").replace(/\/$/, "");

/** An absolute address on the site from a path that starts with a slash. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** The public contact address: the footer, the weekly email's sender and security reports. */
export const CONTACT_EMAIL = "hello@wordonthewater.net";
