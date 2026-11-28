"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { OPEN_VIDEO_CONSENT } from "@/lib/videos/consent";

const never = () => () => {};

/** The footer's way to change the choice, on the video pages only. It needs JavaScript. */
export function CookieSettings() {
  const pathname = usePathname();
  const interactive = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  const onVideoPage = pathname === "/videos" || pathname?.startsWith("/videos/");
  if (!interactive || !onVideoPage) return null;
  return (
    <>
      {" · "}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_VIDEO_CONSENT))}
        className="inline-flex min-h-11 cursor-pointer items-center underline hover:text-on-deep"
      >
        Cookie settings
      </button>
    </>
  );
}
