import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ArrowKeys } from "@/components/bible/arrow-keys";
import { ChapterNav } from "@/components/bible/chapter-nav";
import { PassagePopover } from "@/components/bible/passage-popover";
import { PassageSheet } from "@/components/bible/passage-sheet";
import { Reader } from "@/components/bible/reader";
import { RememberVersion } from "@/components/bible/remember-version";
import { VersionSwitcher } from "@/components/bible/version-switcher";
import { type Book, type ChapterRef, findBook, neighbours } from "@/lib/bible/books";
import { isBibleEnabled } from "@/lib/bible/flag";
import { getPassage } from "@/lib/bible/get-passage";
import { parseChapter, versesParam } from "@/lib/bible/params";
import { chapterPath, passageTitle } from "@/lib/bible/reference";
import { findVersion } from "@/lib/bible/versions";

type Props = {
  params: Promise<{ version: string; book: string; chapter: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
};

const gutters =
  "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]";

/** Reads the passage once per request, for both the metadata and the page. Verses that cannot be read show the whole chapter. */
const load = cache(
  async (versionId: string, bookSlug: string, chapterParam: string, verses: string | undefined) => {
    const chapter = parseChapter(chapterParam);
    const version = findVersion(versionId);
    const book = findBook(bookSlug);
    if (!isBibleEnabled() || chapter === null || !version || !book) notFound();

    let result = await getPassage({ version: versionId, book: bookSlug, chapter, verses });
    const invalidVerses = result.status === "invalid-range";
    if (invalidVerses) result = await getPassage({ version: versionId, book: bookSlug, chapter });
    if (result.status !== "ok") notFound();

    return { passage: result.passage, version, book, invalidVerses };
  },
);

/** The addresses of the chapters before and after, or null at either end of the Bible. */
function chapterLinks(versionId: string, book: Book, chapter: number) {
  const { previous, next } = neighbours(book, chapter);
  const path = (ref: ChapterRef | null) =>
    ref ? chapterPath(versionId, ref.book, ref.chapter) : null;
  return { previous: path(previous), next: path(next) };
}

async function fromProps({ params, searchParams }: Props) {
  const { version, book, chapter } = await params;
  return load(version, book, chapter, versesParam((await searchParams).v));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { passage, version, book } = await fromProps(props);
  const title = passageTitle(book, passage.chapter, passage.range);
  const links = chapterLinks(version.id, book, passage.chapter);
  return {
    title: `${title} (${version.short})`,
    description: `Read ${title} in the ${version.name}.`,
    // A verse range points at its chapter, so the chapter is the one page search engines keep.
    alternates: { canonical: chapterPath(version.id, book.slug, passage.chapter) },
    // rel="prev" and rel="next", so search engines and readers' tools can follow the chapters.
    pagination: { previous: links.previous, next: links.next },
  };
}

export default async function BibleChapterPage(props: Props) {
  const { passage, version, book, invalidVerses } = await fromProps(props);
  const links = chapterLinks(version.id, book, passage.chapter);
  const state = {
    version: version.id,
    book: book.slug,
    chapter: passage.chapter,
    from: passage.range?.from ?? null,
    to: passage.range?.to ?? null,
  };
  return (
    <div className={`mx-auto max-w-[1080px] ${gutters}`}>
      <RememberVersion id={version.id} />
      <ArrowKeys previous={links.previous} next={links.next} />
      <div className="flex items-center gap-2 border-b border-line py-2 lg:hidden">
        <PassageSheet state={state} />
        <VersionSwitcher state={state} />
      </div>
      <div className="hidden items-center gap-3 border-b border-line py-3 lg:flex">
        {/* Remount for each passage, so the picker never holds the choices of the one before. */}
        <PassagePopover
          key={`${state.version}/${state.book}/${state.chapter}/${state.from}-${state.to}`}
          state={state}
        />
        <VersionSwitcher state={state} />
      </div>
      <div className="min-w-0 lg:pt-8">
        <Reader passage={passage} version={version} book={book} invalidVerses={invalidVerses} />
        <ChapterNav version={version.id} book={book} chapter={passage.chapter} />
      </div>
    </div>
  );
}
