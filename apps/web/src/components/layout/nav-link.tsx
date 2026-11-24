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

/**
 * A link to the home page, from the home page, does not scroll in the Next router (and a link to
 * `#top` does nothing once the address already ends in it), so scroll to the top ourselves.
 */
export function NavLink({ match, className = "", onClick, ...props }: Props) {
  const pathname = usePathname() ?? "";
  const isCurrent = match !== undefined && (pathname === match || pathname.startsWith(`${match}/`));
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (props.href === "/" && pathname === "/") {
          event.preventDefault();
          window.scrollTo(0, 0);
          if (location.hash) history.replaceState(null, "", "/");
        }
      }}
      aria-current={isCurrent ? "page" : undefined}
      className={`${className} ${current}`}
    />
  );
}
