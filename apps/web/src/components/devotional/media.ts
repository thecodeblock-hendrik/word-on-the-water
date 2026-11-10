import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CONTENT_DIR } from "@/lib/devotionals/load";

/** A short hash of an image's bytes: the version in its URL. */
export function hashOf(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex").slice(0, 8);
}

/** The current version of an image in content/. */
export function contentVersion(
  kind: "devotionals" | "series" | "site",
  slug: string,
  file: string,
) {
  return hashOf(readFileSync(/* turbopackIgnore: true */ join(CONTENT_DIR, kind, slug, file)));
}

/**
 * The URL of an image in content/, served by src/app/content. The path carries a hash of the
 * file, so replacing an image gives a new URL and no cache (browser or image optimizer) keeps the old one.
 */
export function mediaUrl(
  kind: "devotionals" | "series" | "site",
  slug: string,
  file: string,
): string {
  return `/content/${kind}/${slug}/${contentVersion(kind, slug, file)}/${file}`;
}
