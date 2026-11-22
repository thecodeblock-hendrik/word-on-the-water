import type { Thread } from "@/lib/chat/thread";

export type Cleared = { thread: Thread; draft: string };

// Held in memory only, never in storage, so a cleared chat is really gone once Undo is not offered.
let cleared: Cleared | null = null;

/** Keeps the chat that was just cleared, so Undo can bring it back. Only the latest is kept. */
export function stashCleared(chat: Cleared): void {
  cleared = chat;
}

/** Hands back the cleared chat once, or null. */
export function takeCleared(): Cleared | null {
  const chat = cleared;
  cleared = null;
  return chat;
}

export function dropCleared(): void {
  cleared = null;
}
