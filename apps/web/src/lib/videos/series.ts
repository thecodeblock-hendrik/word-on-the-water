import { parse as parseYaml } from "yaml";
import { z } from "zod";

const text = z.string().min(1);

const video = z.strictObject({
  theme: text,
  /** The Bible word the video is about. */
  word: text,
  /** The video's title on YouTube. */
  title: text,
  /** The day its week starts. */
  from: z.iso.date(),
  length: z.string().regex(/^\d{1,2}:[0-5]\d$/, "must look like 4:33"),
  youtubeId: z.string().regex(/^[\w-]{11}$/, "must be an 11 character YouTube video id"),
  sourceUrl: z.url().startsWith("https://bibleproject.com/videos/"),
  intro: text.max(160),
});

const videoSeries = z
  .strictObject({
    /** The short name on the series cover, such as "Advent". */
    season: text,
    title: text,
    introduction: text.max(200),
    /** The folder in content/series whose art is the series' banner. */
    art: z.string().regex(/^[a-z0-9-]+$/, "must be a folder name in content/series"),
    /** From this day no week is current. */
    noCurrentWeekFrom: z.iso.date(),
    videos: z.array(video).min(1),
  })
  .refine(
    (s) => {
      const days = [...s.videos.map((v) => v.from), s.noCurrentWeekFrom];
      return days.every((day, i) => i === 0 || days[i - 1] < day);
    },
    { path: ["videos"], message: "weeks must be in date order and end at noCurrentWeekFrom" },
  );

type VideoEntry = z.infer<typeof video>;
/** `week` is the name used in ?week=, such as "joy". */
export type Video = VideoEntry & { week: string };
export type VideoSeries = Omit<z.infer<typeof videoSeries>, "videos"> & {
  slug: string;
  videos: Video[];
};

/** Read and check the text of a video series file. Throws one readable error. */
export function parseVideoSeries(source: string, slug: string): VideoSeries {
  const result = videoSeries.safeParse(parseYaml(source));
  if (!result.success) {
    const problems = result.error.issues.map(
      (i) => `${i.path.join(".") || "series"}: ${i.message}`,
    );
    throw new Error(`Video series "${slug}":\n  ${problems.join("\n  ")}`);
  }
  const videos = result.data.videos.map((v) => ({ ...v, week: v.theme.toLowerCase() }));
  return { ...result.data, slug, videos };
}

/** The length of all the videos together, to the nearest minute. */
export function totalMinutes(series: VideoSeries): number {
  const seconds = series.videos.reduce((sum, { length }) => {
    const [minutes, rest] = length.split(":").map(Number);
    return sum + minutes * 60 + rest;
  }, 0);
  return Math.round(seconds / 60);
}

export type WeekState = {
  /** The week shown open, if any. */
  open: string | null;
  /** The week labelled "This week", if any. */
  current: string | null;
};

/**
 * Which week is open and which is labelled, on a YYYY-MM-DD day. `requested` is the raw ?week=
 * value: a known week name wins, anything else counts as no choice.
 */
export function weekState(
  series: VideoSeries,
  today: string,
  requested?: string | string[],
): WeekState {
  const over = today >= series.noCurrentWeekFrom;
  const current = over ? null : (series.videos.findLast((v) => v.from <= today)?.week ?? null);
  const chosen = series.videos.find((v) => v.week === requested)?.week;
  const byDate = over ? null : (current ?? series.videos[0].week);
  return { open: chosen ?? byDate, current };
}
