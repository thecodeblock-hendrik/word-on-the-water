"use client";

import {
  type ComponentPropsWithRef,
  type CSSProperties,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { CountdownRing } from "@/components/chat/countdown-ring";
import { bottomNav } from "@/content/bottom-nav";
import { dropCleared, hasCleared, subscribeCleared, takeCleared } from "@/lib/chat/cleared";
import { restoreChat } from "@/lib/chat/open";

/** How long Undo is offered. A timer that cannot be paused fails WCAG 2.2.1, so focus pauses it. */
const VISIBLE_MS = 8000;
/** How long the shelf takes to grow out of the bar, and to settle back into it. */
const SETTLE_MS = 350;

const row =
  "flex h-13 items-center gap-2 pl-[22px] pr-1.5 font-ui text-[15px] font-semibold text-ink";
const lens =
  "glass-pill inline-flex min-h-11 min-w-16 items-center justify-center gap-2 pl-2.5 pr-4 font-bold text-ink";

const stillWanted = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * "Chat cleared" with Undo, shown on a phone after the chat was left with something in it, as a
 * shelf on the bottom bar. It is its own pane of glass behind the bar (globals.css joins the two),
 * not part of it: the status area is always there and empty until then, so screen readers announce
 * the change, and Undo is never taken for one of the bar's tabs.
 *
 * When the time is up the offer ends at once: the status area empties and the chat is forgotten.
 * What is then seen settling into the bar is only a picture of the shelf, outside the status area.
 */
export function UndoToast() {
  const visible = useSyncExternalStore(subscribeCleared, hasCleared, () => false);
  const [closing, setClosing] = useState(false);
  // A new offer takes the place of an old one still closing.
  if (visible && closing) setClosing(false);

  const timeUp = useCallback(() => {
    dropCleared();
    setClosing(!stillWanted());
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  return (
    <>
      <div role="status">{visible && <Shelf onTimeUp={timeUp} />}</div>
      {closing && !visible && <ClosingShelf />}
    </>
  );
}

/**
 * Notes, once, how a pane arrives: out of a bar that is showing, or on its own. The styles move it
 * by this, and as it never changes, scrolling later does not play the entrance again.
 */
function noteWhereFrom(pane: HTMLDivElement | null) {
  if (!pane) return;
  const away = document.documentElement.hasAttribute("data-nav-away");
  const bar = document.querySelector("nav[data-hides]");
  pane.dataset.from = bar && !away ? "bar" : "alone";
}

/** The pane of glass. Only drawn in the browser, so its style is set from script (the CSP). */
function Pane({ className = "", ...rest }: ComponentPropsWithRef<"div">) {
  return (
    <div
      ref={noteWhereFrom}
      className={`glass-dock glass-surface fixed z-[29] mx-auto max-w-[440px] rounded-[32px] lg:hidden ${className}`}
      style={{ "--settle": `${SETTLE_MS}ms` } as CSSProperties}
      {...rest}
    />
  );
}

/**
 * The offer itself and its timer. Whether Undo holds focus lives here, so it is forgotten with the
 * shelf: a button that is removed reports no blur, and the next offer must not start out paused.
 */
function Shelf({ onTimeUp }: { onTimeUp: () => void }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onTimeUp, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [paused, onTimeUp]);

  function undo() {
    const chat = takeCleared();
    if (chat) restoreChat(chat);
  }

  return (
    <Pane data-shelf="">
      <div data-shelf-row="" className={row}>
        <span className="flex-1">{bottomNav.cleared}</span>
        <button
          type="button"
          onClick={undo}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className={lens}
        >
          <CountdownRing running={!paused} ms={VISIBLE_MS} />
          {bottomNav.undo}
        </button>
      </div>
    </Pane>
  );
}

/** The shelf on its way out: it looks the same, and cannot be tapped, focused or read out. */
function ClosingShelf() {
  return (
    <Pane data-shelf="closing" aria-hidden="true" inert className="pointer-events-none">
      <div data-shelf-row="" className={row}>
        <span className="flex-1">{bottomNav.cleared}</span>
        <span className={lens}>
          <CountdownRing running={false} ms={VISIBLE_MS} />
          {bottomNav.undo}
        </span>
      </div>
    </Pane>
  );
}
