import Link from "next/link";
import type { ReactNode } from "react";

import { GlassPill } from "@/components/layout/glass-pill";
import { glassTab, glassTabIcon } from "@/components/layout/glass-tab";
import { type Book, type ChapterRef, findBook, neighbours } from "@/lib/bible/books";
import { chapterPath } from "@/lib/bible/reference";

// Below lg each side is a tab in the glass capsule: a chevron above the short name. From lg it is
// a bordered button with a text arrow and the full name.
const button = `${glassTab} lg:min-h-12 lg:flex-none lg:flex-row lg:gap-1.5 lg:rounded-sm lg:border-[1.5px] lg:px-4 lg:text-[16px] lg:leading-[1.65]`;
const outlined = "lg:border-line lg:bg-bg lg:hover:border-accent";
const filled = "lg:border-accent-ink lg:bg-accent-ink lg:text-bg lg:hover:brightness-110";
const dead =
  "cursor-not-allowed max-lg:opacity-40 lg:border-line lg:bg-bg lg:text-muted lg:opacity-60";

const name = (ref: ChapterRef) => `${findBook(ref.book)!.name} ${ref.chapter}`;
const shortName = (ref: ChapterRef) => `${findBook(ref.book)!.short} ${ref.chapter}`;

// Only the form that is shown (display: none is left out) is in the link's name, so a spoken label
// ("Matt 15") matches what is on screen. (Not the `hidden` attribute: Tailwind's base styles make
// it display: none !important, which nothing can override.)
const Place = ({ to }: { to: ChapterRef }) => (
  <span className="max-w-full truncate">
    <span className="max-lg:hidden">{name(to)}</span>
    <span className="lg:hidden">{shortName(to)}</span>
  </span>
);

const Arrow = ({ children }: { children: string }) => (
  <span aria-hidden="true" className="flex-none max-lg:hidden">
    {children}
  </span>
);

const Chevron = ({ to }: { to: "left" | "right" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`${glassTabIcon} lg:hidden`}
  >
    <path d={to === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

/** The words on a disabled side: the full ones from lg, one word in the capsule. */
const DeadEnd = ({ long, brief }: { long: string; brief: string }) => (
  <>
    <span className="max-w-full truncate max-lg:hidden">{long}</span>
    <span className="max-w-full truncate lg:hidden">{brief}</span>
  </>
);

/**
 * Previous and next chapter, crossing into the neighbouring book at either end of a book. They are
 * plain links to the whole chapter in the same Bible, so they work without JavaScript. Below lg
 * they float in the glass capsule in thumb reach (the page leaves room for it, see the layout);
 * from lg they sit under the text. At the very start and end of the Bible the missing side is a
 * disabled button.
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
  /** The middle tab below lg: Shore, or Your chat. */
  children?: ReactNode;
}) {
  const { previous, next } = neighbours(book, chapter);
  const href = (ref: ChapterRef) => chapterPath(version, ref.book, ref.chapter);

  return (
    <nav
      aria-label="Previous and next chapter"
      data-chapter-nav
      data-hides=""
      className="max-lg:glass-dock max-lg:glass-bar fixed z-30 mx-auto flex max-w-[440px] lg:static lg:z-auto lg:w-full lg:max-w-[62ch] lg:justify-between lg:gap-2 lg:pb-16"
    >
      <GlassPill />
      {previous ? (
        <Link href={href(previous)} className={`${button} ${outlined} lg:justify-start`}>
          <span className="sr-only">Previous chapter:</span> <Chevron to="left" />
          <Arrow>←</Arrow>
          <Place to={previous} />
        </Link>
      ) : (
        <button
          type="button"
          disabled
          aria-label="Start of the Bible"
          className={`${button} ${dead} lg:justify-start`}
        >
          <Chevron to="left" />
          <Arrow>←</Arrow>
          <DeadEnd long="Start of the Bible" brief="Start" />
        </button>
      )}
      {children}
      {next ? (
        <Link href={href(next)} className={`${button} ${filled} lg:justify-end`}>
          <span className="sr-only">Next chapter:</span> <Chevron to="right" />
          <Place to={next} />
          <Arrow>→</Arrow>
        </Link>
      ) : (
        <button
          type="button"
          disabled
          aria-label="End of the Bible"
          className={`${button} ${dead} lg:justify-end`}
        >
          <Chevron to="right" />
          <DeadEnd long="End of the Bible" brief="End" />
          <Arrow>→</Arrow>
        </button>
      )}
    </nav>
  );
}
