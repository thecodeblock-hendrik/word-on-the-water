"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { allowVideos } from "@/lib/actions/video-consent";
import type { VideoConsent } from "@/lib/videos/consent";
import { playerUrl } from "@/lib/videos/links";

import { ConsentNeeded } from "./consent-needed";

const never = () => () => {};

type Props = {
  youtubeId: string;
  theme: string;
  length: string;
  /** The address asked for this week (?week=), so the page scrolls to it. */
  linked: boolean;
  /** The saved choice about YouTube; undefined while there is none. */
  consent?: VideoConsent;
  /** Our own cover, shown until the visitor taps Play. */
  children: React.ReactNode;
};

/**
 * A cover with a Play button. YouTube's player is added only by that tap, and only once YouTube is
 * accepted; before that the tap offers to allow it. The player is removed when its row closes,
 * which stops the sound, or when the choice becomes Decline. Without JavaScript there is only the
 * cover.
 */
export function VideoPlayer({ youtubeId, theme, length, linked, consent, children }: Props) {
  const interactive = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  const [view, setView] = useState<"cover" | "off" | "playing">("cover");
  const [seen, setSeen] = useState(consent);
  if (seen !== consent) {
    setSeen(consent);
    if (consent === "no" || view === "off") setView("cover");
  }
  const box = useRef<HTMLDivElement>(null);
  const backToPlay = useRef(false);

  useEffect(() => {
    const row = box.current!.closest("details")!;
    const onToggle = () => {
      if (!row.open) {
        setView("cover");
        return;
      }
      // A row closing above can push this one's heading under the header or off the screen.
      // The page's scroll-padding-top is the room the sticky header takes.
      const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      if (row.getBoundingClientRect().top < header) row.scrollIntoView({ block: "start" });
    };
    row.addEventListener("toggle", onToggle);
    return () => row.removeEventListener("toggle", onToggle);
  }, []);

  useEffect(() => {
    if (linked) box.current!.closest("details")!.scrollIntoView({ block: "start" });
  }, [linked]);

  const allow = () => {
    setView("playing");
    void allowVideos();
  };
  const notNow = () => {
    backToPlay.current = true;
    setView("cover");
  };
  const focusAfterNotNow = (button: HTMLButtonElement | null) => {
    if (button && backToPlay.current) {
      backToPlay.current = false;
      button.focus();
    }
  };

  return (
    <div
      ref={box}
      // The cover and the player keep the video's shape; the panel is as tall as its words need.
      className={`relative w-full overflow-hidden rounded-xl ${view === "off" ? "" : "aspect-video min-h-[200px]"}`}
    >
      {view === "playing" && (
        <iframe
          ref={(frame) => frame?.focus()}
          src={playerUrl(youtubeId)}
          title={`${theme}, a video by BibleProject`}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; fullscreen; picture-in-picture"
          className="absolute inset-0 size-full border-0 bg-black"
        />
      )}
      {view === "off" && <ConsentNeeded onAllow={allow} onNotNow={notNow} />}
      {view === "cover" && (
        <>
          {children}
          {interactive && (
            <>
              <button
                ref={focusAfterNotNow}
                type="button"
                aria-label={`Play ${theme}`}
                onClick={() => setView(consent === "yes" ? "playing" : "off")}
                className="absolute left-1/2 top-[44%] grid size-[68px] -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/95"
              >
                <span
                  aria-hidden="true"
                  className="ml-1.5 border-y-[11px] border-l-[18px] border-y-transparent border-l-[#2b2d42]"
                />
              </button>
              <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-2 font-ui text-xs text-white">
                {length}
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}
