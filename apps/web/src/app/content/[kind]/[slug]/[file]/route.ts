import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { CONTENT_DIR, VERSE_CARDS } from "@/lib/devotionals/load";
import { SERIES_ART } from "@/lib/devotionals/series";

const FILES: Record<string, readonly string[]> = { devotionals: VERSE_CARDS, series: SERIES_ART };

type Params = Promise<{ kind: string; slug: string; file: string }>;

/** Serves the images in content/ (verse cards and series art). Nothing else in content/ is public. */
export async function GET(_request: Request, { params }: { params: Params }) {
  const { kind, slug, file } = await params;
  const allowed = FILES[kind]?.includes(file) && /^[a-z0-9-]+$/.test(slug);
  if (!allowed) return new Response("Not found", { status: 404 });

  try {
    const image = await readFile(/* turbopackIgnore: true */ join(CONTENT_DIR, kind, slug, file));
    return new Response(new Uint8Array(image), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
