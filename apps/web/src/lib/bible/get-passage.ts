import "server-only";

import { findBook, hasChapter } from "./books.ts";
import { localSource } from "./local-source.ts";
import { selectVerses } from "./passage.ts";
import type { BibleSource, Passage } from "./types.ts";
import { findVersion } from "./versions.ts";

export type PassageRequest = {
  version: string;
  book: string;
  chapter: number;
  /** For example "16" or "16-18"; leave out for the whole chapter. */
  verses?: string;
};

export type PassageResult =
  { status: "ok"; passage: Passage } | { status: "not-found" } | { status: "invalid-range" };

const SOURCES: Partial<Record<string, BibleSource>> = { files: localSource() };

/** The one entry point for the reader. Version, book and chapter are checked against our own lists first. */
export async function getPassage(request: PassageRequest): Promise<PassageResult> {
  const version = findVersion(request.version);
  const book = findBook(request.book);
  const source = version && SOURCES[version.source];
  if (!version?.enabled || !source || !book || !hasChapter(book, request.chapter)) {
    return { status: "not-found" };
  }

  const data = await source.getChapter(version.id, book.slug, request.chapter);
  const passage = selectVerses(data, request.verses);
  return passage === "invalid-range" ? { status: "invalid-range" } : { status: "ok", passage };
}
