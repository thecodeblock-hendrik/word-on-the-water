const PRODUCTION_URL = "https://wordonthewater.net";

/**
 * The public address of the site, for canonical links, the sitemap and social previews. Next turns
 * the page's relative links (prev and next, images) into absolute ones from it, so it has to be the
 * address the page is really served from: a link to another site is blocked by the CSP, and Firefox
 * prefetches rel="next". SITE_URL (the same setting as the API) wins; a Vercel preview uses its own
 * address; anything else is the production domain.
 */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const preview =
    env.VERCEL_ENV === "preview" && env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined;
  return (env.SITE_URL || preview || PRODUCTION_URL).replace(/\/$/, "");
}

export const SITE_URL = resolveSiteUrl();

/** An absolute address on the site from a path that starts with a slash. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** The public contact address: the footer, the weekly email's sender and security reports. */
export const CONTACT_EMAIL = "hello@wordonthewater.net";
