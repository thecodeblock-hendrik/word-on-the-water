import Link from "next/link";

import { InlineMarkdown } from "@/components/inline-markdown";
import { PlaceholderText } from "@/components/placeholder-text";
import { buttonClasses } from "@/components/ui/button";
import { coming } from "@/content/landing";
import type { Devotional } from "@/lib/devotionals/parse";
import { reportRows } from "@/lib/devotionals/report";
import type { Series } from "@/lib/devotionals/series";
import { formatDate } from "@/lib/devotionals/format";

const eyebrow = "font-display text-sm font-semibold uppercase tracking-[.18em] text-accent-ink";
const h3 = "font-display text-[1.35rem] font-semibold uppercase leading-[1.05] tracking-[.05em]";

/** What is on the way, plus the latest devotional so readers can see what they will get. */
export function Coming({ devotional, series }: { devotional: Devotional; series: Series }) {
  const { meta } = devotional;
  const report = reportRows(devotional, series);
  const excerpt = devotional.sections[0].markdown.split("\n\n");
  return (
    <section id="coming" aria-labelledby="coming-h" className="py-10 md:py-[72px]">
      <div className="mx-auto max-w-[1120px] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <div className="mb-9 grid max-w-[62ch] gap-3">
          <p className={eyebrow}>{coming.eyebrow}</p>
          <h2
            id="coming-h"
            className="font-display text-[clamp(2rem,4.5vw,2.75rem)] font-semibold uppercase leading-[1.05] tracking-[.04em] text-balance"
          >
            {coming.heading}
          </h2>
          <p className="text-muted">{coming.intro}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {coming.offers.map((offer) => (
            <article
              key={offer.title}
              className="grid content-start gap-3 rounded-md border border-line bg-surface p-6"
            >
              <span className="flex items-center gap-2 font-ui text-xs font-semibold uppercase tracking-[.08em] text-muted">
                <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
                <span>
                  <PlaceholderText>{offer.status}</PlaceholderText>
                </span>
              </span>
              <h3 className={h3}>{offer.title}</h3>
              <p className="text-[.98rem] text-muted">
                <PlaceholderText>{offer.body}</PlaceholderText>
              </p>
            </article>
          ))}
        </div>
        <div
          role="region"
          aria-label="Devotional preview"
          className="mt-7 grid overflow-hidden rounded-md border border-line bg-surface md:grid-cols-[260px_minmax(0,1fr)]"
        >
          <div className="grid content-start gap-3.5 bg-deep p-6 font-ui text-on-deep">
            <h4 className="font-display text-[.9rem] font-semibold uppercase tracking-[.18em] text-accent-on-deep">
              Today&apos;s report
            </h4>
            <dl className="grid gap-2.5">
              {report.map(({ term, value }) => (
                <div
                  key={term}
                  className="flex justify-between gap-3 border-b border-on-deep/20 pb-2 text-sm"
                >
                  <dt className="text-on-deep-muted">{term}</dt>
                  <dd className="m-0 text-right font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid max-w-[70ch] gap-3.5 p-7">
            <span className={eyebrow}>Latest devotional</span>
            <h3 className={`${h3} text-[1.7rem]`}>{meta.title}</h3>
            <span className="font-ui text-[13px] tracking-[.04em] text-muted">
              {formatDate(meta.publishAt)} · by {meta.author}
            </span>
            {excerpt.map((paragraph) => (
              <p key={paragraph}>
                <InlineMarkdown>{paragraph}</InlineMarkdown>
              </p>
            ))}
            <Link
              href={`/devotionals/${devotional.slug}`}
              className={`${buttonClasses("primary")} justify-self-start`}
            >
              Read the full devotional
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
