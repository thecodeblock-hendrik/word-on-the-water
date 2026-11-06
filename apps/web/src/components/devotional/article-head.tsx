import Link from "next/link";

import { ContentImage } from "@/components/content-image";
import { mediaUrl } from "@/components/devotional/media";
import { formatDateLong } from "@/lib/devotionals/format";
import type { Devotional } from "@/lib/devotionals/parse";
import { type Series, seriesPosition } from "@/lib/devotionals/series";

const art = "absolute inset-0 size-full object-cover";
const sizes = "(min-width: 1080px) 1048px, 100vw";

/** Breadcrumbs, title, summary, byline and the series illustration. */
export function ArticleHead({ devotional, series }: { devotional: Devotional; series: Series }) {
  const { meta, readMinutes } = devotional;
  const src = (file: string) => mediaUrl("series", series.slug, file);
  return (
    <>
      <nav aria-label="Breadcrumb" className="pt-[22px] font-ui text-[13px] text-muted">
        <Link href="/#coming" className="underline">
          Devotionals
        </Link>
        {" / "}
        <span>{series.title}</span>
        {" / "}
        {meta.seriesNumber} of {series.outline.length}
      </nav>
      <header className="grid max-w-[760px] gap-3.5 pb-7 pt-[18px]">
        <p className="font-display text-[.88rem] font-semibold uppercase tracking-[.18em] text-accent-ink">
          {seriesPosition(series, meta.seriesNumber)}
        </p>
        <h1 className="font-display text-[clamp(2.6rem,7vw,4.4rem)] font-semibold uppercase leading-[1.05] tracking-[.03em] text-balance">
          {meta.title}
        </h1>
        <p className="max-w-[52ch] text-[1.2rem] leading-[1.5] text-muted">{meta.summary}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1.5 font-ui text-sm text-muted">
          <span>By {meta.author}</span>
          <span>{formatDateLong(meta.publishAt)}</span>
          <span>{readMinutes} min read</span>
        </p>
      </header>
      <figure className="relative m-0 aspect-[4/3] overflow-hidden rounded-md bg-deep sm:aspect-[21/9]">
        <div className="when-light absolute inset-0">
          <ContentImage
            src={src("art-dawn-patrol.png")}
            alt={series.artAlt}
            width={1600}
            height={686}
            priority
            sizes={sizes}
            className={art}
          />
        </div>
        <div className="when-dark absolute inset-0">
          <ContentImage
            src={src("art-night-swell.png")}
            alt={series.artAlt}
            width={1600}
            height={686}
            priority
            sizes={sizes}
            className={art}
          />
        </div>
        <figcaption className="absolute bottom-2 right-2.5 rounded-[3px] bg-[rgb(10_24_37/.55)] px-2 py-[3px] font-ui text-xs text-[#e9eef1]">
          Illustration: {series.title} series art
        </figcaption>
      </figure>
    </>
  );
}
