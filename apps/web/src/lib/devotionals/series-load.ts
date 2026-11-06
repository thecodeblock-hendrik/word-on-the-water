import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseSeries, type Series, SERIES_ART } from "./series.ts";

export const SERIES_DIR = join(process.cwd(), "content", "series");

/** Load every series folder. Folders starting with "_" are skipped. */
export function loadSeries(dir: string = SERIES_DIR): Series[] {
  return readdirSync(/* turbopackIgnore: true */ dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => {
      const series = parseSeries(
        readFileSync(/* turbopackIgnore: true */ join(dir, e.name, "series.yml"), "utf8"),
        e.name,
      );
      for (const art of SERIES_ART) {
        if (!existsSync(join(/* turbopackIgnore: true */ dir, e.name, art))) {
          throw new Error(`Series "${e.name}":\n  Missing file ${art}.`);
        }
      }
      return series;
    });
}
