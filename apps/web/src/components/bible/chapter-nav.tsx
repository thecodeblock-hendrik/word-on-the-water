import Link from "next/link";

import { type Book, type ChapterRef, findBook, neighbours } from "@/lib/bible/books";
import { chapterPath } from "@/lib/bible/reference";

const button =
  "flex min-h-12 flex-1 items-center gap-2 rounded-sm border-[1.5px] px-4 font-ui text-[16px] font-semibold lg:flex-none";
const outlined = "border-line bg-bg text-ink hover:border-accent";
const filled = "border-accent-ink bg-accent-ink text-bg hover:brightness-110";
const dead = "cursor-not-allowed border-line bg-bg text-muted opacity-60";

const name = (ref: ChapterRef) => `${findBook(ref.book)!.name} ${ref.chapter}`;

/**
 * Previous and next chapter, crossing into the neighbouring book at either end of a book. They are
 * plain links to the whole chapter in the same Bible, so they work without JavaScript. Stuck to the
 * bottom of a phone screen in thumb reach; under the text from lg. At the very start and end of the
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
      className="sticky bottom-0 z-30 -mx-4 flex gap-2 border-t border-line bg-surface px-4 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:static lg:z-auto lg:mx-auto lg:w-full lg:max-w-[62ch] lg:justify-between lg:border-0 lg:bg-transparent lg:p-0 lg:pb-16"
    >
      {previous ? (
        <Link
          href={href(previous)}
          aria-label={`Previous chapter: ${name(previous)}`}
          className={`${button} ${outlined} justify-start`}
        >
          <span aria-hidden="true">←</span>
          {name(previous)}
        </Link>
      ) : (
        <button type="button" disabled className={`${button} ${dead} justify-start`}>
          <span aria-hidden="true">←</span> Start of the Bible
        </button>
      )}
      {next ? (
        <Link
          href={href(next)}
          aria-label={`Next chapter: ${name(next)}`}
          className={`${button} ${filled} justify-end`}
        >
          {name(next)}
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <button type="button" disabled className={`${button} ${dead} justify-end`}>
          End of the Bible <span aria-hidden="true">→</span>
        </button>
      )}
    </nav>
  );
}
