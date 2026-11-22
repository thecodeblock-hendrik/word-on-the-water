"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "./bottom-nav";

/**
 * The bottom bar for every page except the Bible reader, which keeps its own pinned chapter bar.
 * Devotional is the current page on a devotional.
 */
export function BottomNavHost({ devotionalHref }: { devotionalHref: string }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/bible" || pathname.startsWith("/bible/")) return null;
  const onDevotional = pathname.startsWith("/devotionals/");
  return (
    <BottomNav devotionalHref={devotionalHref} current={onDevotional ? "devotional" : undefined} />
  );
}
