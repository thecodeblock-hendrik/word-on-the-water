import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { hashOf } from "@/components/devotional/media";
import { CONTENT_DIR, VERSE_CARDS } from "@/lib/devotionals/load";
import { SERIES_ART } from "@/lib/devotionals/series";

const FILES: Record<string, readonly string[]> = {
  devotionals: VERSE_CARDS,
  series: SERIES_ART,
  site: ["henno-surfing.jpg"],
};

type Params = Promise<{ kind: string; slug: string; version: string; file: string }>;

/** Serves the images in content/ (verse cards, series art and the founder photo). The version segment must be the file's current hash: it busts caches, and refusing other values keeps anyone from minting endless cached copies. Nothing else in content/ is public. */
export async function GET(_request: Request, { params }: { params: Params }) {
  const { kind, slug, version, file } = await params;
  const allowed = FILES[kind]?.includes(file) && /^[a-z0-9-]+$/.test(slug);
  if (!allowed) return new Response("Not found", { status: 404 });

  try {
    const image = await readFile(/* turbopackIgnore: true */ join(CONTENT_DIR, kind, slug, file));
    if (hashOf(image) !== version) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(image), {
      headers: { "Content-Type": file.endsWith(".jpg") ? "image/jpeg" : "image/png", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
