import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConsentBanner } from "@/components/videos/consent-banner";
import { SeriesHeading } from "@/components/videos/series-heading";
import { VideoColumn } from "@/components/videos/video-column";
import { WeekRow } from "@/components/videos/week-row";
import { today } from "@/lib/devotionals/format";
import { isVideosEnabled } from "@/lib/videos/flag";
import { SERIES_PATH } from "@/lib/videos/links";
import { loadVideoSeries } from "@/lib/videos/load";
import { savedVideoConsent } from "@/lib/videos/saved-consent";
import { weekState } from "@/lib/videos/series";

export const metadata: Metadata = {
  title: "Advent word studies",
  description: "Hope, peace, joy and love: four short videos by BibleProject, one for each week.",
  alternates: { canonical: SERIES_PATH },
};

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

/** The weekly path: every week in order, with this week's (or ?week=) open. */
export default async function AdventVideosPage({ searchParams }: Props) {
  if (!isVideosEnabled()) notFound();
  const series = loadVideoSeries("advent");
  const { week } = await searchParams;
  const { open, current } = weekState(series, today(), week);
  const consent = await savedVideoConsent();
  return (
    <VideoColumn>
      <Link
        href="/videos"
        className="inline-flex min-h-11 items-center gap-1.5 justify-self-start font-ui font-semibold text-accent-ink"
      >
        <span aria-hidden="true">‹</span>
        Videos
      </Link>
      <ConsentBanner consent={consent} />
      <div className="grid gap-3 rounded-[20px] border border-white/10 bg-deep px-3 py-4 text-on-deep">
        <SeriesHeading
          art={series.art}
          eyebrow={`${series.season} ${series.videos[0].from.slice(0, 4)}`}
          title={series.title}
          introduction={series.introduction}
        />
        <h2 className="sr-only">The {series.videos.length} weeks</h2>
        <div className="grid gap-2">
          {series.videos.map((video, i) => (
            <WeekRow
              key={video.week}
              video={video}
              number={i + 1}
              open={video.week === open}
              thisWeek={video.week === current}
              linked={video.week === week}
              consent={consent}
            />
          ))}
        </div>
      </div>
    </VideoColumn>
  );
}
