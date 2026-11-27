import Link from "next/link";

import { ChatLauncher } from "@/components/chat/chat-launcher";
import { bottomNav } from "@/content/bottom-nav";

import { BibleIcon, ChatIcon, DevotionalIcon, ShoreIcon } from "./bottom-nav-icons";
import { glassTab, glassTabIcon } from "./glass-tab";

/**
 * The phone and tablet bottom bar, a floating glass capsule with three equal tabs: Devotional,
 * Bible and Ask the Word. Shore, the way back to the landing page, takes the place of Devotional
 * on a devotional page and of Ask the Word on the chat screen. No tab is ever the current page.
 * Below `lg` only; the desktop header carries the same places.
 */
export function BottomNav({
  devotionalHref,
  variant = "site",
  onDevotional = false,
  onNavigate,
}: {
  devotionalHref: string;
  /** The visitor is reading a devotional (not used on the chat screen). */
  onDevotional?: boolean;
  /** Called when a link is followed, for example to close the chat the bar sits in. */
  onNavigate?: () => void;
  variant?: "site" | "chat";
}) {
  const shore = (
    <Link href="/" onClick={onNavigate} className={glassTab}>
      <ShoreIcon className={glassTabIcon} />
      {bottomNav.shore}
    </Link>
  );
  return (
    <nav
      aria-label={bottomNav.landmark}
      data-bottom-nav
      className="glass-dock glass-bar fixed z-30 mx-auto flex max-w-[440px] lg:hidden"
    >
      {variant === "site" && onDevotional ? (
        shore
      ) : (
        <Link href={devotionalHref} onClick={onNavigate} className={glassTab}>
          <DevotionalIcon className={glassTabIcon} />
          {bottomNav.devotional}
        </Link>
      )}
      <Link href="/bible" onClick={onNavigate} prefetch={false} className={glassTab}>
        <BibleIcon className={glassTabIcon} />
        {bottomNav.bible}
      </Link>
      {variant === "chat" ? (
        shore
      ) : (
        <ChatLauncher className={glassTab}>
          <ChatIcon className={glassTabIcon} />
          {bottomNav.askTheWord}
        </ChatLauncher>
      )}
    </nav>
  );
}
