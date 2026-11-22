import type { Cleared } from "@/lib/chat/cleared";

export const OPEN_CHAT = "wotw:open-chat";

/** Asks the one chat panel (see ChatHost) to open; `opener` is where focus goes when it closes. */
export function openChat(opener: HTMLElement | null): void {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT, { detail: opener }));
}

export const RESTORE_CHAT = "wotw:restore-chat";

/** Asks the one chat panel to open again with a chat that was cleared (Undo). */
export function restoreChat(chat: Cleared): void {
  window.dispatchEvent(new CustomEvent(RESTORE_CHAT, { detail: chat }));
}
