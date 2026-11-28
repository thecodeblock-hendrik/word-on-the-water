"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { followScroll } from "@/lib/nav/follow-scroll";

/**
 * Hides the phone navigation bar while the page scrolls (every bar marked `data-hides`, never the chat's).
 * It starts again, shown, on each new page or chapter.
 */
export function HideBarOnScroll() {
  const pathname = usePathname();
  useEffect(() => followScroll(), [pathname]);
  return null;
}
