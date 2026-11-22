import Link from "next/link";

import { RaisedBump } from "@/components/layout/raised-bump";
import { ShoreIcon } from "@/components/layout/bottom-nav-icons";
import { bottomNav } from "@/content/bottom-nav";

/**
 * The middle of the Bible reader's bar on a phone: a round surfboard-in-the-sand button that goes
 * back to the landing page, in the same raised bump as the Your chat button it gives way to.
 */
export function ShoreButton() {
  return (
    <div data-bar-middle className="relative w-14 flex-none self-stretch lg:hidden">
      <RaisedBump className="absolute left-1/2 top-[-37.5px] h-[30px] w-[104px] -translate-x-1/2" />
      <Link href="/" className="absolute inset-0 font-ui text-xs font-bold leading-none text-ink">
        <span className="absolute left-1/2 top-[-30px] grid size-14 -translate-x-1/2 place-items-center rounded-full bg-ink text-bg">
          <ShoreIcon className="size-7" />
        </span>
        <span className="absolute inset-x-0 top-[29px] text-center">{bottomNav.shore}</span>
      </Link>
    </div>
  );
}
