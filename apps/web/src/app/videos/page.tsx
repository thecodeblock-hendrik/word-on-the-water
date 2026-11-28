import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SERIES_COLOURS } from "@/components/videos/colours";
import { ConsentBanner } from "@/components/videos/consent-banner";
import { ThisWeek } from "@/components/videos/this-week";
import { VideoColumn } from "@/components/videos/video-column";
import { today } from "@/lib/devotionals/format";
import { isVideosEnabled } from "@/lib/videos/flag";
import { BIBLEPROJECT_URL, SERIES_PATH } from "@/lib/videos/links";
import { loadVideoSeries } from "@/lib/videos/load";
import { savedVideoConsent } from "@/lib/videos/saved-consent";
import { totalMinutes, weekState } from "@/lib/videos/series";

export const metadata: Metadata = {
  title: "Videos",
  description: "Short Bible videos to watch and share, by BibleProject.",
  alternates: { canonical: "/videos" },
};

/** The shelf of video series. There is one series today. */
export default async function VideosPage() {
  if (!isVideosEnabled()) notFound();
  const series = loadVideoSeries("advent");
  const { current } = weekState(series, today());
  const thisWeek = series.videos.find((v) => v.week === current);
  const consent = await savedVideoConsent();
  return (
    <VideoColumn>
      <h1
        tabIndex={-1}
        className="font-display text-[clamp(2.2rem,7vw,3.4rem)] font-semibold uppercase leading-[1.05] tracking-[.03em]"
      >
        Videos
      </h1>
      <p className="text-muted">Short Bible videos to watch and share.</p>
      <ConsentBanner consent={consent} />
      <Link
        href={SERIES_PATH}
        className="grid overflow-hidden rounded-[20px] border border-line bg-surface"
      >
        <span className={`video-cover flex min-h-48 flex-col justify-end p-4 ${SERIES_COLOURS}`}>
          <span className="font-ui text-sm font-semibold">
            {series.videos.length} videos, about {totalMinutes(series)} minutes
          </span>
          <span className="font-display text-5xl font-bold uppercase">{series.season}</span>
        </span>
        <div className="grid justify-items-start gap-1.5 px-4 py-3.5">
          {thisWeek && <ThisWeek>This week: {thisWeek.theme}</ThisWeek>}
          <h2 className="font-ui text-lg font-semibold">{series.title}</h2>
          <span className="font-ui text-sm text-muted">{series.introduction} By BibleProject.</span>
        </div>
      </Link>
      <p className="font-ui text-sm text-muted">
        Videos by BibleProject, their author and owner.{" "}
        <a href={BIBLEPROJECT_URL} className="text-accent-ink underline underline-offset-2">
          bibleproject.com
        </a>
      </p>
    </VideoColumn>
  );
}
