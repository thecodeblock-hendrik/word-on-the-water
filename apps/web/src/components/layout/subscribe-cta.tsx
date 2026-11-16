"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonClasses } from "@/components/ui/button";

/**
 * The header's sign-up button. It is left out on the thank-you page, where the visitor has already
 * signed up. A spacer takes over its `ml-auto`, so the menu button stays at the right edge.
 */
export function SubscribeCta() {
  if (usePathname() === "/thank-you")
    return <span aria-hidden="true" className="ml-auto lg:hidden" />;
  return (
    <Link
      href="/#subscribe"
      className={`${buttonClasses("primary")} ml-auto max-[419px]:px-4 lg:ml-0`}
    >
      <span className="hidden min-[520px]:max-lg:inline xl:inline">Get the devotional</span>
      <span className="min-[520px]:max-lg:hidden xl:hidden">Subscribe</span>
    </Link>
  );
}
