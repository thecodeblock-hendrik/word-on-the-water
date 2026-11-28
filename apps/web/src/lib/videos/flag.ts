/** The video pages and their links are hidden until VIDEOS_ENABLED=1. */
export function isVideosEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.VIDEOS_ENABLED === "1";
}
