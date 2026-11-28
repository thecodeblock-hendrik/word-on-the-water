import Link from "next/link";

import { formatDateShort } from "@/lib/devotionals/format";
import type { VideoConsent } from "@/lib/videos/consent";
import { BIBLEPROJECT_URL, YOUTUBE_TERMS_URL } from "@/lib/videos/links";
import type { Video } from "@/lib/videos/series";

import { WEEK_COLOURS } from "./colours";
import { ThisWeek } from "./this-week";
import { VideoPlayer } from "./video-player";

const link = "underline underline-offset-2 hover:text-ink text-accent-ink";
const bigLink = `inline-flex min-h-11 items-center font-semibold ${link}`;

type Props = {
  video: Video;
  number: number;
  open: boolean;
  thisWeek: boolean;
  linked: boolean;
  consent?: VideoConsent;
};

/**
 * One week of the path. The rows share a name, so the browser keeps only one open, with or
 * without JavaScript.
 */
export function WeekRow({ video, number, open, thisWeek, linked, consent }: Props) {
  const colour = WEEK_COLOURS[(number - 1) % WEEK_COLOURS.length];
  return (
    <details
      id={video.week}
      name="video-week"
      open={open}
      className="group rounded-[14px] bg-surface text-ink"
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-[14px] px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span
          className={`grid size-10 flex-none place-items-center rounded-full font-display text-lg font-bold text-white ${colour}`}
        >
          {number}
        </span>
        <span className="grid flex-1 font-ui">
          <span className="flex flex-wrap items-center gap-x-2">
            <span data-theme-name className="font-semibold">
              {video.theme}
            </span>
            {thisWeek && <ThisWeek />}
          </span>
          <span className="text-sm text-muted">
            From {formatDateShort(video.from)} · {video.length}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="mr-1 size-2.5 flex-none -translate-y-0.5 rotate-45 border-b-2 border-r-2 border-current transition-transform group-open:translate-y-0.5 group-open:rotate-[225deg]"
        />
      </summary>
      <div className="grid gap-2 px-2 pb-3">
        <VideoPlayer
          youtubeId={video.youtubeId}
          theme={video.theme}
          length={video.length}
          linked={linked}
          consent={consent}
        >
          <div className={`video-cover flex size-full flex-col justify-end p-4 pr-16 ${colour}`}>
            <span aria-hidden="true" className="font-serif text-sm font-semibold italic">
              {video.word}
            </span>
            <span aria-hidden="true" className="font-display text-4xl font-bold uppercase">
              {video.theme}
            </span>
          </div>
        </VideoPlayer>
        <div className="grid px-1">
          <p className="font-ui text-sm text-muted">
            Video by BibleProject, its author and owner.{" "}
            <a href={BIBLEPROJECT_URL} className={link}>
              bibleproject.com
            </a>
          </p>
          <p className="font-ui text-sm">
            <a href={video.sourceUrl} className={bigLink}>
              Watch on BibleProject
            </a>
          </p>
          <p className="font-ui text-sm text-muted">
            Pressing play loads the video from YouTube, a Google service, which then receives data
            such as your IP address. By playing, you agree to the{" "}
            <a href={YOUTUBE_TERMS_URL} className={link}>
              YouTube Terms
            </a>{" "}
            and our{" "}
            <Link href="/privacy" className={link}>
              Privacy policy
            </Link>
            .
          </p>
          <p className="mt-2">{video.intro}</p>
        </div>
      </div>
    </details>
  );
}
