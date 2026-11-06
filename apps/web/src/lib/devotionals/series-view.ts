import { formatDayMonth } from "./format.ts";
import type { Devotional } from "./parse.ts";
import type { Series } from "./series.ts";

export type SeriesItem = {
  number: number;
  title: string;
  passage: string;
  date: string;
  /** Set when the devotional is published and is not the page being viewed. */
  href?: string;
  current: boolean;
};

export type SeriesLink = { label: string; title: string; passage?: string; href?: string };

/**
 * A series as one reader sees it from one devotional: every planned week, with the real
 * devotional's details where it exists, plus the previous and next links.
 */
export function seriesView(current: Devotional, series: Series, all: Devotional[], today: string) {
  const items: SeriesItem[] = series.outline.map((planned) => {
    const written = all.find(
      (d) => d.meta.series === series.slug && d.meta.seriesNumber === planned.number,
    );
    const isCurrent = planned.number === current.meta.seriesNumber;
    const live = written && written.meta.publishAt <= today && !isCurrent;
    return {
      number: planned.number,
      title: written?.meta.title ?? planned.title,
      passage: written?.meta.passages.join("; ") ?? planned.passage,
      date: written?.meta.publishAt ?? planned.date,
      href: live ? `/devotionals/${written.slug}` : undefined,
      current: isCurrent,
    };
  });

  const at = current.meta.seriesNumber - 1;
  const link = (item: SeriesItem, word: string): SeriesLink => ({
    label: `${word} · ${formatDayMonth(item.date)}`,
    title: item.title,
    passage: item.passage,
    href: item.href,
  });
  const previous: SeriesLink | undefined = items[at - 1]
    ? link(items[at - 1], "Previous")
    : { label: "New here?", title: "Start here", href: "/#start" };
  const next = items[at + 1] ? link(items[at + 1], "Next") : undefined;

  return { items, previous, next };
}
