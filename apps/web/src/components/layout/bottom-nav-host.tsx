"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { BottomNav } from "./bottom-nav";

/** Only redirects to the chapter last read, so it never has a bar of its own. */
const TO_THE_READER = "/bible";

/**
 * The bottom bar for every page except the Bible reader, which keeps its own pinned chapter bar.
 * On a devotional its left tab is Shore. While `/bible` redirects, the bar stays as it was, so
 * there is no moment without one before the reader's bar arrives.
 */
export function BottomNavHost({ devotionalHref }: { devotionalHref: string }) {
  const pathname = usePathname() ?? "";
  const [lastPage, setLastPage] = useState(pathname);
  if (pathname !== TO_THE_READER && pathname !== lastPage) setLastPage(pathname);
  const page = pathname === TO_THE_READER ? lastPage : pathname;

  if (page.startsWith("/bible/")) return null;
  return (
    <BottomNav devotionalHref={devotionalHref} onDevotional={page.startsWith("/devotionals/")} />
  );
}
