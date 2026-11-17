import type { MetadataRoute } from "next";

import { isBibleEnabled } from "@/lib/bible/flag";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { THEME_COLORS } from "@/lib/theme";

/**
 * The web app manifest: what makes the site installable. There is one icon set and one colour
 * pair, because a manifest cannot follow the light and dark theme; the navy matches the icons.
 * No `orientation` on purpose: a lock fails WCAG 1.3.4.
 */
export default function manifest(): MetadataRoute.Manifest {
  const bible = isBibleEnabled();
  const shortcutIcon = [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }];
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
    shortcuts: [
      { name: "Start here", short_name: "Start here", url: "/#start", icons: shortcutIcon },
      ...(bible
        ? [{ name: "Bible", short_name: "Bible", url: "/bible", icons: shortcutIcon }]
        : []),
    ],
    screenshots: [
      shot("landing.png", "The landing page"),
      shot("devotional.png", "A devotional"),
      ...(bible ? [shot("bible.png", "The Bible reader")] : []),
    ],
  };
}

/** A phone screenshot from scripts/make-screenshots.mts (375 x 812 at 2x). */
function shot(file: string, label: string) {
  return {
    src: `/screenshots/${file}`,
    sizes: "750x1624",
    type: "image/png",
    form_factor: "narrow" as const,
    label,
  };
}
