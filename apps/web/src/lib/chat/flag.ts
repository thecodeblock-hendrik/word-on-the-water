/** Ask the Word is hidden (the button stays a mail link, the API answers 503) until CHAT_ENABLED=1. */
export function isChatEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.CHAT_ENABLED === "1";
}
