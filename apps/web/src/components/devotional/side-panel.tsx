import Link from "next/link";

import { formatDateShort } from "@/lib/devotionals/format";
import type { Devotional } from "@/lib/devotionals/parse";
import { reportRows } from "@/lib/devotionals/report";
import type { Series } from "@/lib/devotionals/series";
import type { SeriesItem } from "@/lib/devotionals/series-view";

function Item({ item }: { item: SeriesItem }) {
  const detail = item.current ? item.passage : `${item.passage} · ${formatDateShort(item.date)}`;
  return (
    <li
      aria-current={item.current ? "page" : undefined}
      className={`grid grid-cols-[24px_minmax(0,1fr)] gap-2 border-t border-line py-[7px] text-sm ${
        item.current ? "font-semibold text-ink" : "text-muted"
      }`}
    >
      <span
        aria-hidden="true"
        className={`font-display font-semibold ${item.current ? "text-accent-ink" : ""}`}
      >
        {item.number}
      </span>
      <div>
        {item.href ? (
          <Link href={item.href} className="hover:underline">
            {item.title}
          </Link>
        ) : (
          item.title
        )}
        <span className="block text-[12.5px] font-normal text-muted">{detail}</span>
      </div>
    </li>
  );
}

/** The surf report. Above the article on a phone, in the side column on a wide screen. */
export function SurfReport({ devotional, series }: { devotional: Devotional; series: Series }) {
  return (
    <aside
      aria-label="About this devotional"
      className="grid min-w-0 gap-3.5 rounded-md bg-deep p-[22px] font-ui text-on-deep max-lg:order-first"
    >
      <h3 className="font-display text-[.92rem] font-semibold uppercase tracking-[.2em] text-accent-on-deep">
        Surf report
      </h3>
      <dl className="m-0 grid gap-2.5">
        {reportRows(devotional, series).map(({ term, value }) => (
          <div
            key={term}
            className="flex justify-between gap-3 border-b border-on-deep/20 pb-2 text-sm"
          >
            <dt className="text-on-deep-muted">{term}</dt>
            <dd className="m-0 text-right font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

/** The weeks of the series. Below the article on a phone, under the surf report on a wide screen. */
export function SeriesList({ series, items }: { series: Series; items: SeriesItem[] }) {
  return (
    <nav
      aria-label={`${series.title} weeks`}
      className="grid min-w-0 gap-3 rounded-md border border-line bg-surface p-5 font-ui max-lg:order-last"
    >
      <h3 className="font-display text-base font-semibold uppercase tracking-[.14em]">
        {series.title}
      </h3>
      <ol className="m-0 grid list-none gap-0.5 p-0">
        {items.map((item) => (
          <Item key={item.number} item={item} />
        ))}
      </ol>
    </nav>
  );
}
