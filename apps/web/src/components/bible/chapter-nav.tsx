import Link from "next/link";
import type { ReactNode } from "react";

import { type Book, type ChapterRef, findBook, neighbours } from "@/lib/bible/books";
import { chapterPath } from "@/lib/bible/reference";

// The label is one line: the arrow never shrinks, the font scales down on narrow phones (16px from
// about 420px wide, 12.5px at the narrowest), and `truncate` on the name is the last resort, never
// a second line. Measured on every book: no name is cut off from 320px up.
const button =
  "flex min-h-12 min-w-0 flex-1 items-center gap-1 rounded-sm border-[1.5px] px-2 font-ui text-[clamp(12.5px,3.8vw,16px)] font-semibold lg:flex-none lg:gap-1.5 lg:px-4 lg:text-[16px]";
const outlined = "border-line bg-bg text-ink hover:border-accent";
const filled = "border-accent-ink bg-accent-ink text-bg hover:brightness-110";
const dead = "cursor-not-allowed border-line bg-bg text-muted opacity-60";

const name = (ref: ChapterRef) => `${findBook(ref.book)!.name} ${ref.chapter}`;
const shortName = (ref: ChapterRef) => `${findBook(ref.book)!.short} ${ref.chapter}`;

// While the Your chat button is in the bar (a phone), each name gives way to its standard short form,
// so the full word is never cut off. Only the form that is shown (display: none is left out) is in
// the link's name, so a spoken label ("Matt 15") matches what is on screen. (Not the `hidden`
// attribute: Tailwind's base styles make it display: none !important, which nothing can override.)
const SHOW_FULL = "group-has-[[data-bar-middle]]/nav:max-lg:hidden";
const SHOW_SHORT = "hidden group-has-[[data-bar-middle]]/nav:max-lg:inline";

const Place = ({ to }: { to: ChapterRef }) => (
  <span className="min-w-0 truncate">
    <span className={SHOW_FULL}>{name(to)}</span>
    <span className={SHOW_SHORT}>{shortName(to)}</span>
  </span>
);

const Arrow = ({ children }: { children: string }) => (
  <span aria-hidden="true" className="flex-none">
    {children}
  </span>
);

/**
 * Previous and next chapter, crossing into the neighbouring book at either end of a book. They are
 * plain links to the whole chapter in the same Bible, so they work without JavaScript. Pinned to the
 * bottom of a phone screen in thumb reach, whatever is scrolled behind it (the page leaves room
 * for it, see the layout); under the text from lg. At the very start and end of the
 * Bible the missing side is a disabled button.
 */
export function ChapterNav({
  version,
  book,
  chapter,
  children,
}: {
  version: string;
  book: Book;
  chapter: number;
  /** Sits between Previous and Next on a phone (the Your chat button). */
  children?: ReactNode;
}) {
  const { previous, next } = neighbours(book, chapter);
  const href = (ref: ChapterRef) => chapterPath(version, ref.book, ref.chapter);

  return (
    <nav
      aria-label="Previous and next chapter"
      data-chapter-nav
      className="group/nav fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-surface pl-[max(.75rem,env(safe-area-inset-left))] pr-[max(.75rem,env(safe-area-inset-right))] pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:static lg:z-auto lg:mx-auto lg:w-full lg:max-w-[62ch] lg:justify-between lg:border-0 lg:bg-transparent lg:p-0 lg:pb-16"
    >
      {previous ? (
        <Link href={href(previous)} className={`${button} ${outlined} justify-start`}>
          <span className="sr-only">Previous chapter:</span> <Arrow>←</Arrow>
          <Place to={previous} />
        </Link>
      ) : (
        <button type="button" disabled className={`${button} ${dead} justify-start`}>
          <Arrow>←</Arrow>
          <span className="min-w-0 truncate">Start of the Bible</span>
        </button>
      )}
      {children}
      {next ? (
        <Link href={href(next)} className={`${button} ${filled} justify-end`}>
          <span className="sr-only">Next chapter:</span> <Place to={next} />
          <Arrow>→</Arrow>
        </Link>
      ) : (
        <button type="button" disabled className={`${button} ${dead} justify-end`}>
          <span className="min-w-0 truncate">End of the Bible</span>
          <Arrow>→</Arrow>
        </button>
      )}
    </nav>
  );
}
