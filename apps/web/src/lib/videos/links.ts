/** BibleProject's terms ask for a link to their site beside every video. */
export const BIBLEPROJECT_URL = "https://www.bibleproject.com/";
/** The terms a visitor agrees to by playing a video. */
export const YOUTUBE_TERMS_URL = "https://www.youtube.com/t/terms";
export const SERIES_PATH = "/videos/advent";

/** The one origin a video player may come from; the CSP allows it while videos are on. */
export const PLAYER_ORIGIN = "https://www.youtube-nocookie.com";

/** Only for ids from our own content files, which the loader has checked. */
export function playerUrl(youtubeId: string): string {
  return `${PLAYER_ORIGIN}/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0`;
}
