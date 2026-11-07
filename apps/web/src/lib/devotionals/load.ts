import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { type Devotional, parseDevotional } from "./parse.ts";
import type { Series } from "./series.ts";
import { loadSeries } from "./series-load.ts";

export const CONTENT_DIR = join(/* turbopackIgnore: true */ process.cwd(), "content");
export const DEVOTIONALS_DIR = join(CONTENT_DIR, "devotionals");
export const VERSE_CARDS = ["verse-card-dawn-patrol.png", "verse-card-night-swell.png"] as const;

/** Load every devotional folder, newest first. Folders starting with "_" (the template) are skipped. */
export function loadDevotionals(dir: string = DEVOTIONALS_DIR): Devotional[] {
  const slugs = readdirSync(/* turbopackIgnore: true */ dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name);

  const all = slugs.map((slug) => {
    const devotional = parseDevotional(
      readFileSync(/* turbopackIgnore: true */ join(dir, slug, "devotional.md"), "utf8"),
      slug,
    );
    for (const card of VERSE_CARDS) {
      if (!existsSync(join(/* turbopackIgnore: true */ dir, slug, card))) {
        throw new Error(`Devotional "${slug}":\n  Missing file ${card}.`);
      }
    }
    return devotional;
  });

  checkSeriesNumbers(all);
  return all.sort((a, b) => b.meta.publishAt.localeCompare(a.meta.publishAt));
}

/** Load devotionals and series together and check that they agree. */
export function loadContent(root: string = CONTENT_DIR): {
  devotionals: Devotional[];
  series: Series[];
} {
  const devotionals = loadDevotionals(join(root, "devotionals"));
  const series = loadSeries(join(root, "series"));
  for (const { slug, meta } of devotionals) {
    const found = series.find((s) => s.slug === meta.series);
    if (!found) {
      throw new Error(
        `Devotional "${slug}":\n  series "${meta.series}" has no folder in content/series.`,
      );
    }
    if (!found.outline.some((o) => o.number === meta.seriesNumber)) {
      throw new Error(
        `Devotional "${slug}":\n  seriesNumber ${meta.seriesNumber} is not in the ${found.title} outline.`,
      );
    }
  }
  return { devotionals, series };
}

/** Devotionals whose publish date is today or earlier. `today` is a YYYY-MM-DD string. */
export function published(all: Devotional[], today: string): Devotional[] {
  return all.filter((d) => d.meta.publishAt <= today);
}

export function latestPublished(all: Devotional[], today: string): Devotional | undefined {
  return published(all, today)[0];
}

/** The devotional to feature: the latest published one, or the first one before any is published. */
export function featured(all: Devotional[], today: string): Devotional | undefined {
  return latestPublished(all, today) ?? all.at(-1);
}

/** A devotional page is shown once published, and the first one is shown before any is. */
export function isViewable(all: Devotional[], slug: string, today: string): boolean {
  return published(all, today).some((d) => d.slug === slug) || featured(all, today)?.slug === slug;
}

function checkSeriesNumbers(all: Devotional[]) {
  const seen = new Set<string>();
  for (const { slug, meta } of all) {
    const key = `${meta.series} ${meta.seriesNumber}`;
    if (seen.has(key)) {
      throw new Error(
        `Devotional "${slug}":\n  ${meta.series} number ${meta.seriesNumber} is used twice.`,
      );
    }
    seen.add(key);
  }
}
