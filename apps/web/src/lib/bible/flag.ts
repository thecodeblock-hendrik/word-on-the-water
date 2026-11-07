/** The Bible reader is hidden (its pages return 404) until BIBLE_ENABLED=1. */
export function isBibleEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.BIBLE_ENABLED === "1";
}
