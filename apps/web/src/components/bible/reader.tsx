import Link from "next/link";

import { PassageText } from "@/components/bible/passage-text";
import type { Book } from "@/lib/bible/books";
import { passageTitle, verseLabel } from "@/lib/bible/reference";
import type { Passage } from "@/lib/bible/types";
import type { BibleVersion } from "@/lib/bible/versions";

type Props = {
  passage: Passage;
  version: BibleVersion;
  book: Book;
  /** True when the verses in the address could not be read and the whole chapter is shown. */
  invalidVerses?: boolean;
};

const note =
  "max-w-[62ch] rounded-md border border-line bg-surface px-4 py-3 font-ui text-[.95rem]";

/** One chapter or a few verses, with the version, a note when verses are missing, and the credit. */
export function Reader({ passage, version, book, invalidVerses = false }: Props) {
  const { range, fallback } = passage;
  const chapterHref = `/bible/${version.id}/${book.slug}/${passage.chapter}`;

  return (
    <article aria-labelledby="passage-title" className="mx-auto grid max-w-[62ch] gap-6 pb-16 pt-8">
      <header className="grid gap-3">
        <p className="font-display text-[.88rem] font-semibold uppercase tracking-[.18em] text-accent-ink">
          {version.name}
        </p>
        <h1
          id="passage-title"
          className="font-display text-[clamp(2.2rem,7vw,3.4rem)] font-semibold uppercase leading-[1.05] tracking-[.03em] text-balance"
        >
          {passageTitle(book, passage.chapter, range)}
        </h1>
        {range && (
          <p className="flex flex-wrap items-center gap-x-4 font-ui text-[.95rem] text-muted">
            <span>
              {range.from === range.to ? "Verse" : "Verses"}{" "}
              {range.from === range.to ? range.from : `${range.from} to ${range.to}`}
            </span>
            <Link
              href={chapterHref}
              className="inline-flex min-h-11 items-center text-accent-ink underline"
            >
              Show full chapter
            </Link>
          </p>
        )}
      </header>

      {fallback && (
        <p role="note" className={note}>
          {fallback.from === fallback.to ? "Verse" : "Verses"} {verseLabel(fallback)}{" "}
          {fallback.from === fallback.to ? "is" : "are"} not in the {version.name}, so the whole
          chapter is shown.
        </p>
      )}
      {invalidVerses && (
        <p role="note" className={note}>
          That verse range was not understood, so the whole chapter is shown.
        </p>
      )}

      <div lang="en" className="font-serif text-[1.19rem] leading-[1.8]">
        <PassageText blocks={passage.blocks} />
      </div>

      <p className="font-ui text-xs leading-relaxed text-muted">{version.credit}</p>
    </article>
  );
}
