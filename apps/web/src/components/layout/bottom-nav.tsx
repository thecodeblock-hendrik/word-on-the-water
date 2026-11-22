import Link from "next/link";

import { ChatLauncher } from "@/components/chat/chat-launcher";
import { bottomNav } from "@/content/bottom-nav";

import { RaisedBump } from "./raised-bump";
import { BibleIcon, ChatIcon, DevotionalIcon, ShoreIcon } from "./bottom-nav-icons";

const side =
  "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-sm border-[1.5px] px-1 text-center font-ui text-xs font-semibold leading-[14px]";
const outlined = "border-line bg-bg text-ink hover:border-accent";
const here = "border-accent-ink bg-bg text-accent-ink";
const filled = "border-accent-ink bg-accent-ink text-bg hover:brightness-110";

/**
 * The phone bottom bar: Devotional on the left, Bible in the middle in a raised round button, and
 * Ask the Word on the right (Shore, the way back to the landing page, on the chat screen). Below
 * `lg` only; the desktop header carries the same places.
 */
export function BottomNav({
  devotionalHref,
  variant = "site",
  current,
  onNavigate,
}: {
  devotionalHref: string;
  /** The page the visitor is on, shown by colour and `aria-current`. */
  current?: "devotional";
  /** Called when a link is followed, for example to close the chat the bar sits in. */
  onNavigate?: () => void;
  variant?: "site" | "chat";
}) {
  return (
    <nav
      aria-label={bottomNav.landmark}
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-surface pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <Link
        href={devotionalHref}
        onClick={onNavigate}
        aria-current={current === "devotional" ? "page" : undefined}
        className={`${side} ${current === "devotional" ? here : outlined}`}
      >
        <DevotionalIcon className="size-5" />
        {bottomNav.devotional}
      </Link>
      <div className="relative w-14 flex-none self-stretch">
        <RaisedBump className="absolute left-1/2 top-[-37.5px] h-[30px] w-[104px] -translate-x-1/2" />
        <Link
          href="/bible"
          onClick={onNavigate}
          prefetch={false}
          className="absolute inset-0 font-ui text-xs font-bold leading-none text-ink"
        >
          <span className="absolute left-1/2 top-[-30px] grid size-14 -translate-x-1/2 place-items-center rounded-full bg-ink text-bg">
            <BibleIcon className="size-7" />
          </span>
          <span className="absolute inset-x-0 top-[29px] text-center">{bottomNav.bible}</span>
        </Link>
      </div>
      {variant === "chat" ? (
        <Link href="/" onClick={onNavigate} className={`${side} ${filled}`}>
          <ShoreIcon className="size-5" />
          {bottomNav.shore}
        </Link>
      ) : (
        <ChatLauncher className={`${side} ${filled}`}>
          <ChatIcon className="size-5" />
          {bottomNav.askTheWord}
        </ChatLauncher>
      )}
    </nav>
  );
}
