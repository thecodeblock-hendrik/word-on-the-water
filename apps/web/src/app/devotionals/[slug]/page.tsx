import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/devotional/article-body";
import { ArticleHead } from "@/components/devotional/article-head";
import { CopyLink } from "@/components/devotional/copy-link";
import { mediaUrl } from "@/components/devotional/media";
import { SeriesNav } from "@/components/devotional/series-nav";
import { SeriesList, SurfReport } from "@/components/devotional/side-panel";
import { SubscribeBand } from "@/components/devotional/subscribe-band";
import { VerseShare } from "@/components/devotional/verse-share";
import { today } from "@/lib/devotionals/format";
import { isViewable, loadContent } from "@/lib/devotionals/load";
import { seriesView } from "@/lib/devotionals/series-view";
import { OPEN_GRAPH_BASE } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

const gutters =
  "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]";

function find(slug: string) {
  const { devotionals, series } = loadContent();
  const devotional = devotionals.find((d) => d.slug === slug);
  if (!devotional || !isViewable(devotionals, slug, today())) notFound();
  return {
    devotionals,
    devotional,
    series: series.find((s) => s.slug === devotional.meta.series)!,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { devotional } = find((await params).slug);
  const { meta } = devotional;
  return {
    title: meta.title,
    description: meta.summary,
    alternates: { canonical: `/devotionals/${devotional.slug}` },
    openGraph: {
      type: "article",
      ...OPEN_GRAPH_BASE,
      title: meta.title,
      description: meta.summary,
      publishedTime: meta.publishAt,
      images: [
        {
          url: mediaUrl("devotionals", devotional.slug, "verse-card-night-swell.png"),
          width: 1080,
          height: 1080,
          alt: meta.imageAlt,
        },
      ],
    },
  };
}

export default async function DevotionalPage({ params }: Props) {
  const { devotionals, devotional, series } = find((await params).slug);
  const { items, previous, next } = seriesView(devotional, series, devotionals, today());
  return (
    <>
      <div className={`mx-auto max-w-[1080px] ${gutters}`}>
        <ArticleHead devotional={devotional} series={series} />
        <div className="grid items-start gap-8 pb-16 pt-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
          <article className="grid min-w-0 max-w-[62ch] gap-10">
            <ArticleBody devotional={devotional} next={next} />
            <VerseShare devotional={devotional} />
            <CopyLink prompt={devotional.meta.sharePrompt ?? "Know a mate who needs this?"} />
            <SeriesNav previous={previous} next={next} />
          </article>
          {/* On a phone the two panels join the grid above and below the article; on a wide screen they stack in a sticky column. */}
          <div className="contents lg:sticky lg:top-20 lg:grid lg:gap-5">
            <SurfReport devotional={devotional} series={series} />
            <SeriesList series={series} items={items} />
          </div>
        </div>
      </div>
      <SubscribeBand source="devotional_band" />
    </>
  );
}
