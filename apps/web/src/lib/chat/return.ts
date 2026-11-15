const RETURN = "wotw-chat-return";
const REOPEN = "wotw-chat-reopen";
const CHANGED = "wotw:chat-return";

/**
 * The way back to the chat, for a visitor who left it by tapping a verse. It lives in this tab's
 * sessionStorage, never in an address, so a shared Bible link shows nothing. Storage can be
 * blocked, so every call is guarded.
 */
function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Without storage there is simply no way back to offer.
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** Remembers the page the chat was on (an address on this site, such as "/" or "/privacy?x=1"). */
export const markChatLeft = (url: string) => write(RETURN, url);

export const clearChatReturn = () => write(RETURN, null);

/** The page to go back to, or null. Anything that is not a path on this site is ignored. */
export function chatReturnUrl(): string | null {
  const url = read(RETURN);
  return url && url.startsWith("/") && !url.startsWith("//") ? url : null;
}

/** Set by the Your chat button, so the next page opens the chat. */
export const requestReopen = () => write(REOPEN, "1");

/** True once after requestReopen. */
export function consumeReopen(): boolean {
  const asked = read(REOPEN) === "1";
  if (asked) write(REOPEN, null);
  return asked;
}

/** Calls `onChange` when the way back is set or cleared, here or in another tab. */
export function subscribeChatReturn(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** True when this page was reached with the browser's Back or Forward button. */
export function cameBackByHistory(): boolean {
  const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return entry?.type === "back_forward";
}
