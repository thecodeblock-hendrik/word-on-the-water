import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/** Crawlers may read the whole site except the API routes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
