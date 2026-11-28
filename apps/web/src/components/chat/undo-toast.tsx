"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { CountdownRing } from "@/components/chat/countdown-ring";
import { bottomNav } from "@/content/bottom-nav";
import { dropCleared, hasCleared, subscribeCleared, takeCleared } from "@/lib/chat/cleared";
import { restoreChat } from "@/lib/chat/open";

/** How long Undo is offered. A timer that cannot be paused fails WCAG 2.2.1, so focus pauses it. */
const VISIBLE_MS = 8000;

/**
 * "Chat cleared" with Undo, shown on a phone after the chat was left with something in it, as a
 * shelf on the bottom bar. It is its own pane of glass behind the bar (globals.css joins the two),
 * not part of it: the status area is always there and empty until then, so screen readers announce
 * the change, and Undo is never taken for one of the bar's tabs.
 */
export function UndoToast() {
  const visible = useSyncExternalStore(subscribeCleared, hasCleared, () => false);
  return <div role="status">{visible && <Shelf />}</div>;
}

/**
 * The offer itself and its timer. Whether Undo holds focus lives here, so it is forgotten with the
 * shelf: a button that is removed reports no blur, and the next offer must not start out paused.
 */
function Shelf() {
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
    <div
      data-shelf=""
      className="glass-dock glass-surface fixed z-[29] mx-auto max-w-[440px] rounded-[32px] lg:hidden"
    >
      <div
        data-shelf-row=""
        className="flex h-13 items-center gap-2 pl-[22px] pr-1.5 font-ui text-[15px] font-semibold text-ink"
      >
        <span className="flex-1">{bottomNav.cleared}</span>
        <button
          type="button"
          onClick={undo}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="glass-pill inline-flex min-h-11 min-w-16 items-center justify-center gap-2 pl-2.5 pr-4 font-bold text-ink"
        >
          <CountdownRing running={!paused} ms={VISIBLE_MS} />
          {bottomNav.undo}
        </button>
      </div>
    </div>
  );
}
