import Link from "next/link";

import { ShoreIcon } from "@/components/layout/bottom-nav-icons";
import { glassTab, glassTabIcon } from "@/components/layout/glass-tab";
import { bottomNav } from "@/content/bottom-nav";

/** The middle tab of the Bible reader's bar below lg: back to the landing page. */
export function ShoreButton() {
  return (
    <Link href="/" className={`${glassTab} lg:hidden`}>
      <ShoreIcon className={glassTabIcon} />
      {bottomNav.shore}
    </Link>
  );
}
