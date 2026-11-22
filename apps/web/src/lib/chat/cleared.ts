import type { Thread } from "@/lib/chat/thread";

export type Cleared = { thread: Thread; draft: string };

// Held in memory only, never in storage, so a cleared chat is really gone once Undo is not offered.
let cleared: Cleared | null = null;
const listeners = new Set<() => void>();

function set(next: Cleared | null) {
  cleared = next;
  listeners.forEach((notify) => notify());
}

/** Keeps the chat that was just cleared, so Undo can bring it back. Only the latest is kept. */
export const stashCleared = (chat: Cleared) => set(chat);

/** Hands back the cleared chat once, or null. */
export function takeCleared(): Cleared | null {
  const chat = cleared;
  if (chat) set(null);
  return chat;
}

export const dropCleared = () => set(null);

export const hasCleared = () => cleared !== null;

export function subscribeCleared(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}
