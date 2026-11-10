import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CONTENT_DIR } from "@/lib/devotionals/load";

/**
 * The URL of an image in content/, served by src/app/content. The path carries a hash of the
 * file, so replacing an image gives a new URL and no cache (browser or image optimizer) keeps the old one.
 */
export function mediaUrl(
  kind: "devotionals" | "series" | "site",
  slug: string,
  file: string,
): string {
  const bytes = readFileSync(/* turbopackIgnore: true */ join(CONTENT_DIR, kind, slug, file));
  const version = createHash("sha1").update(bytes).digest("hex").slice(0, 8);
  return `/content/${kind}/${slug}/${version}/${file}`;
}
