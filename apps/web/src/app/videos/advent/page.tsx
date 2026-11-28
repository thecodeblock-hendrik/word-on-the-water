import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VideoColumn } from "@/components/videos/video-column";
import { WeekRow } from "@/components/videos/week-row";
import { today } from "@/lib/devotionals/format";
import { isVideosEnabled } from "@/lib/videos/flag";
import { SERIES_PATH } from "@/lib/videos/links";
import { loadVideoSeries } from "@/lib/videos/load";
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
  const { open, current } = weekState(series, today(), (await searchParams).week);
  return (
    <VideoColumn>
      <Link
        href="/videos"
        className="inline-flex min-h-11 items-center gap-1.5 justify-self-start font-ui font-semibold text-accent-ink"
      >
        <span aria-hidden="true">‹</span>
        Videos
      </Link>
      <div className="grid gap-3 rounded-[20px] border border-white/10 bg-deep px-3 py-4 text-on-deep">
        <header className="grid gap-1 px-1">
          <p className="font-ui text-xs font-semibold uppercase tracking-[.14em] text-accent-on-deep">
            {series.season} {series.videos[0].from.slice(0, 4)}
          </p>
          <h1 className="font-display text-3xl font-bold uppercase leading-[1.1]">
            {series.title}
          </h1>
          <p className="font-ui text-sm text-on-deep-muted">{series.introduction}</p>
        </header>
        <div className="grid gap-2">
          {series.videos.map((video, i) => (
            <WeekRow
              key={video.week}
              video={video}
              number={i + 1}
              open={video.week === open}
              thisWeek={video.week === current}
            />
          ))}
        </div>
      </div>
    </VideoColumn>
  );
}
