import Link from "next/link";

import { type Book, type ChapterRef, findBook, neighbours } from "@/lib/bible/books";
import { chapterPath } from "@/lib/bible/reference";

// The label is one line: the font scales down only on the narrowest phones (16px from about 375px
// wide), and `truncate` on the label is the last resort, never a second line.
const button =
  "flex min-h-12 min-w-0 flex-1 items-center rounded-sm border-[1.5px] px-3 font-ui text-[clamp(13.5px,4.3vw,16px)] font-semibold lg:flex-none lg:px-4 lg:text-[16px]";
const outlined = "border-line bg-bg text-ink hover:border-accent";
const filled = "border-accent-ink bg-accent-ink text-bg hover:brightness-110";
const dead = "cursor-not-allowed border-line bg-bg text-muted opacity-60";

const name = (ref: ChapterRef) => `${findBook(ref.book)!.name} ${ref.chapter}`;

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
}: {
  version: string;
  book: Book;
  chapter: number;
}) {
  const { previous, next } = neighbours(book, chapter);
  const href = (ref: ChapterRef) => chapterPath(version, ref.book, ref.chapter);

  return (
    <nav
      aria-label="Previous and next chapter"
      data-chapter-nav
      className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-surface pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:static lg:z-auto lg:mx-auto lg:w-full lg:max-w-[62ch] lg:justify-between lg:border-0 lg:bg-transparent lg:p-0 lg:pb-16"
    >
      {previous ? (
        <Link
          href={href(previous)}
          aria-label={`Previous chapter: ${name(previous)}`}
          className={`${button} ${outlined} justify-start`}
        >
          <span className="min-w-0 truncate">{name(previous)}</span>
        </Link>
      ) : (
        <button type="button" disabled className={`${button} ${dead} justify-start`}>
          <span className="min-w-0 truncate">Start of the Bible</span>
        </button>
      )}
      {next ? (
        <Link
          href={href(next)}
          aria-label={`Next chapter: ${name(next)}`}
          className={`${button} ${filled} justify-end`}
        >
          <span className="min-w-0 truncate">{name(next)}</span>
        </Link>
      ) : (
        <button type="button" disabled className={`${button} ${dead} justify-end`}>
          <span className="min-w-0 truncate">End of the Bible</span>
        </button>
      )}
    </nav>
  );
}
