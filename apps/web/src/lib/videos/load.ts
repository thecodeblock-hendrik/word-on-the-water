import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseVideoSeries, type VideoSeries } from "./series";

const VIDEOS_DIR = join(/* turbopackIgnore: true */ process.cwd(), "content", "videos");

/** Load and check one video series from content/videos. */
export function loadVideoSeries(slug: string): VideoSeries {
  const source = readFileSync(/* turbopackIgnore: true */ join(VIDEOS_DIR, `${slug}.yml`), "utf8");
  return parseVideoSeries(source, slug);
}
