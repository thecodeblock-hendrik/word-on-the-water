import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { today } from "@/lib/devotionals/format";
import { isViewable, loadContent } from "@/lib/devotionals/load";
import { absoluteUrl } from "@/lib/site";

/**
 * The home page and every devotional a reader can open today, newest first. It reads the calendar
 * on each request, because a devotional appears on its publish day with no redeploy. The thank-you
 * page is left out on purpose: it is kept out of search results.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const { devotionals } = loadContent();
  const day = today();
  const open = devotionals.filter((d) => isViewable(devotionals, d.slug, day));
  return [
    { url: absoluteUrl("/"), lastModified: open[0]?.meta.publishAt },
    ...open.map((d) => ({
      url: absoluteUrl(`/devotionals/${d.slug}`),
      lastModified: d.meta.publishAt,
    })),
  ];
}
