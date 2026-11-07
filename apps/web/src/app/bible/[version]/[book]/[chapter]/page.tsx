import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Reader } from "@/components/bible/reader";
import { findBook } from "@/lib/bible/books";
import { isBibleEnabled } from "@/lib/bible/flag";
import { getPassage } from "@/lib/bible/get-passage";
import { parseChapter, versesParam } from "@/lib/bible/params";
import { passageTitle } from "@/lib/bible/reference";
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

async function fromProps({ params, searchParams }: Props) {
  const { version, book, chapter } = await params;
  return load(version, book, chapter, versesParam((await searchParams).v));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { passage, version, book } = await fromProps(props);
  const title = passageTitle(book, passage.chapter, passage.range);
  return {
    title: `${title} (${version.short})`,
    description: `Read ${title} in the ${version.name}.`,
    // A verse range points at its chapter, so the chapter is the one page search engines keep.
    alternates: { canonical: `/bible/${version.id}/${book.slug}/${passage.chapter}` },
  };
}

export default async function BibleChapterPage(props: Props) {
  const { passage, version, book, invalidVerses } = await fromProps(props);
  return (
    <div className={`mx-auto max-w-[1080px] ${gutters}`}>
      <Reader passage={passage} version={version} book={book} invalidVerses={invalidVerses} />
    </div>
  );
}
