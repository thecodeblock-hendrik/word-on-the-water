"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { saveVideoConsent } from "@/lib/actions/video-consent";
import { OPEN_VIDEO_CONSENT, type VideoConsent } from "@/lib/videos/consent";

// One style for both, so that neither choice is pushed.
const choiceButton =
  "min-h-11 cursor-pointer rounded-md border-[1.5px] border-ink px-3 font-semibold text-ink";

const SAID = { yes: "You accepted YouTube.", no: "You declined YouTube." };

/**
 * Asks whether YouTube may be used. It is part of the page, not a pop-up. It shows while there is
 * no choice, and again from "Cookie settings".
 */
export function ConsentBanner({ consent }: { consent?: VideoConsent }) {
  const [reopened, setReopened] = useState(false);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(OPEN_VIDEO_CONSENT, reopen);
    return () => window.removeEventListener(OPEN_VIDEO_CONSENT, reopen);
  }, []);

  useEffect(() => {
    if (!reopened) return;
    box.current!.scrollIntoView({ block: "start" });
    box.current!.focus({ preventScroll: true });
  }, [reopened]);

  if (consent && !reopened) return null;

  // The banner goes once a choice is made, so focus moves to the page's heading, not to nowhere.
  const onSubmit = () => {
    setReopened(false);
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  };

  return (
    <section
      ref={box}
      tabIndex={-1}
      aria-labelledby="video-consent-h"
      className="grid gap-2 rounded-[14px] border-2 border-accent bg-surface p-3.5 font-ui text-ink"
    >
      <p id="video-consent-h" className="text-[17px] font-semibold">
        Cookies for videos
      </p>
      {consent && <p className="text-sm font-semibold">{SAID[consent]}</p>}
      <p className="text-sm text-muted">
        Our videos play through YouTube (Google). If you accept, pressing Play lets it set cookies
        and receive data such as your IP address. Nothing is sent to YouTube before that.
      </p>
      <Link
        href="/privacy"
        className="inline-flex min-h-11 items-center justify-self-start text-sm font-semibold text-accent-ink underline underline-offset-2"
      >
        Privacy policy
      </Link>
      <form action={saveVideoConsent} onSubmit={onSubmit} className="grid grid-cols-2 gap-2">
        <button type="submit" name="choice" value="no" className={choiceButton}>
          Decline
        </button>
        <button type="submit" name="choice" value="yes" className={choiceButton}>
          Accept
        </button>
      </form>
    </section>
  );
}
