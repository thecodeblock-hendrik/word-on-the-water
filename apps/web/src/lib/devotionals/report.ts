import type { Devotional } from "./parse.ts";
import type { Series } from "./series.ts";

/** "Advent · 1/5", as shown in the surf report. */
export function seriesShort(series: Series, number: number): string {
  return `${series.title} · ${number}/${series.outline.length}`;
}

/** The first two tags other than the series name, as "Waiting, hope". */
function topics({ meta }: Devotional, series: Series): string {
  const list = meta.tags
    .filter((tag) => tag.toLowerCase() !== series.title.toLowerCase())
    .slice(0, 2)
    .join(", ");
  return list.charAt(0).toUpperCase() + list.slice(1);
}

/** The rows of the surf report panel, on the landing card and on the devotional page. */
export function reportRows(devotional: Devotional, series: Series) {
  const { meta, readMinutes } = devotional;
  return [
    { term: "Passage", value: meta.passages.join("; ") },
    { term: "Series", value: seriesShort(series, meta.seriesNumber) },
    { term: "Read time", value: `${readMinutes} min` },
    { term: "Conditions", value: meta.reportConditions },
    { term: "Topics", value: topics(devotional, series) },
  ];
}
