"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link> & {
  /** Mark the link as the current page on this path and below it. Leave out for links that are never current. */
  match?: string;
};

// Current page is shown by an underline and a heavier weight, not by colour alone.
const current =
  "aria-[current=page]:font-semibold aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8";

export function NavLink({ match, className = "", ...props }: Props) {
  const pathname = usePathname() ?? "";
  const isCurrent = match !== undefined && (pathname === match || pathname.startsWith(`${match}/`));
  return (
    <Link
      {...props}
      aria-current={isCurrent ? "page" : undefined}
      className={`${className} ${current}`}
    />
  );
}
