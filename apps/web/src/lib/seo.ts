import type { Metadata } from "next";

import { absoluteUrl, CONTACT_EMAIL, SITE_URL } from "./site.ts";

export const SITE_NAME = "Word on the Water";
export const SITE_DESCRIPTION = "Devotionals and Bible teaching for men and surfers.";

/** The Open Graph values every page shares. A page with its own `openGraph` spreads these in. */
export const OPEN_GRAPH_BASE = { siteName: SITE_NAME, locale: "en_GB" } as const;

/**
 * What every page inherits. A page that sets its own `openGraph` replaces this one, so it repeats
 * the site name. metadataBase makes relative canonical and image addresses absolute.
 */
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", ...OPEN_GRAPH_BASE },
  twitter: { card: "summary_large_image" },
};

/**
 * Who the site is, for search engines (schema.org). Only what is public and true today: no logo
 * file yet (the icons arrive with the PWA) and no social profiles (the handles are placeholders).
 */
export function siteJsonLd() {
  const organization = absoluteUrl("/#organization");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organization,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        email: CONTACT_EMAIL,
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { "@id": organization },
      },
    ],
  };
}
