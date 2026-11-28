"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { playerUrl } from "@/lib/videos/links";

const never = () => () => {};

type Props = {
  youtubeId: string;
  theme: string;
  length: string;
  /** The address asked for this week (?week=), so the page scrolls to it. */
  linked: boolean;
  /** Our own cover, shown until the visitor taps Play. */
  children: React.ReactNode;
};

/**
 * A cover with a Play button. YouTube's player is added only by that tap, and removed when its
 * row closes, which stops the sound. Without JavaScript there is only the cover.
 */
export function VideoPlayer({ youtubeId, theme, length, linked, children }: Props) {
  const interactive = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = box.current!.closest("details")!;
    const onToggle = () => {
      if (!row.open) {
        setPlaying(false);
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

  return (
    <div
      ref={box}
      className="relative aspect-video min-h-[200px] w-full overflow-hidden rounded-xl"
    >
      {playing ? (
        <iframe
          ref={(frame) => frame?.focus()}
          src={playerUrl(youtubeId)}
          title={`${theme}, a video by BibleProject`}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; fullscreen; picture-in-picture"
          className="absolute inset-0 size-full border-0 bg-black"
        />
      ) : (
        <>
          {children}
          {interactive && (
            <>
              <button
                type="button"
                aria-label={`Play ${theme}`}
                onClick={() => setPlaying(true)}
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
