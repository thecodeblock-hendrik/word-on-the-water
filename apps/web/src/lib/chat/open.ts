export const OPEN_CHAT = "wotw:open-chat";

/** Asks the one chat panel (see ChatHost) to open; `opener` is where focus goes when it closes. */
export function openChat(opener: HTMLElement | null): void {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT, { detail: opener }));
}
