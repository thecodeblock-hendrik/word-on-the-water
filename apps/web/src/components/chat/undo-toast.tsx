"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { bottomNav } from "@/content/bottom-nav";
import { dropCleared, hasCleared, subscribeCleared, takeCleared } from "@/lib/chat/cleared";
import { restoreChat } from "@/lib/chat/open";

/** How long Undo is offered. A timer that cannot be paused fails WCAG 2.2.1, so focus pauses it. */
const VISIBLE_MS = 8000;

/**
 * "Chat cleared" with Undo, shown on a phone after the chat was left with something in it. The
 * status area is always there and empty until then, so screen readers announce the change.
 */
export function UndoToast() {
  const visible = useSyncExternalStore(subscribeCleared, hasCleared, () => false);
  return <div role="status">{visible && <Offer />}</div>;
}

/**
 * The offer itself and its timer. Whether Undo holds focus lives here, so it is forgotten with the
 * toast: a button that is removed reports no blur, and the next offer must not start out paused.
 */
function Offer() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(dropCleared, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [paused]);

  function undo() {
    const chat = takeCleared();
    if (chat) restoreChat(chat);
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-40 flex min-h-13 items-center gap-2 rounded-md border border-on-deep-muted/40 bg-deep pl-4 pr-1 font-ui text-[15px] font-semibold text-on-deep shadow-menu motion-safe:animate-toast-in lg:hidden">
      <span className="flex-1">{bottomNav.cleared}</span>
      <button
        type="button"
        onClick={undo}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-sm px-3 font-bold text-accent-on-deep"
      >
        {bottomNav.undo}
      </button>
    </div>
  );
}
