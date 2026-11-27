"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "./bottom-nav";

/**
 * The bottom bar for every page except the Bible reader, which keeps its own pinned chapter bar.
 * On a devotional its left tab is Shore.
 */
export function BottomNavHost({ devotionalHref }: { devotionalHref: string }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/bible" || pathname.startsWith("/bible/")) return null;
  return (
    <BottomNav
      devotionalHref={devotionalHref}
      onDevotional={pathname.startsWith("/devotionals/")}
    />
  );
}
