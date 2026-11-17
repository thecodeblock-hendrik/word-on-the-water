import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { THEME_COLORS } from "@/lib/theme";

/**
 * The web app manifest: what makes the site installable. There is one icon set and one colour
 * pair, because a manifest cannot follow the light and dark theme; the navy matches the icons.
 * No `orientation` on purpose: a lock fails WCAG 1.3.4.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: "WotW",
    description: SITE_DESCRIPTION,
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLORS.dark,
    theme_color: THEME_COLORS.dark,
    categories: ["lifestyle", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
