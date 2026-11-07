import { type Book, findBook, hasChapter } from "./books.ts";
import { lastVerseOf } from "./counts.ts";
import { findVersion } from "./versions.ts";

/** The order of the steps in the picker. */
export const STEPS = ["bible", "book", "chapter", "verses"] as const;
export type Step = (typeof STEPS)[number];

export type PickerState = {
  version: string;
  book: string;
  chapter: number;
  /** The verses chosen, or null for the whole chapter. */
  from: number | null;
  to: number | null;
};

export const chapterNumbers = (book: Book): number[] =>
  Array.from({ length: book.chapters }, (_, i) => i + 1);

/** Changing the Bible keeps the passage. Unknown and disabled versions are ignored. */
export function chooseVersion(state: PickerState, id: string): PickerState {
  return findVersion(id)?.enabled ? { ...state, version: id } : state;
}

/** A new book starts at chapter 1 with no verses chosen. */
export function chooseBook(state: PickerState, slug: string): PickerState {
  return findBook(slug) ? { ...state, book: slug, chapter: 1, from: null, to: null } : state;
}

export function chooseChapter(state: PickerState, chapter: number): PickerState {
  const book = findBook(state.book);
  return book && hasChapter(book, chapter) ? { ...state, chapter, from: null, to: null } : state;
}

/** Keeps the verses inside the chapter: from is at least 1, to is between from and the last verse. */
export function chooseVerses(
  state: PickerState,
  from: number | null,
  to: number | null,
): PickerState {
  if (from === null || to === null) return { ...state, from: null, to: null };
  const last = lastVerseOf(state.version, findBook(state.book)!, state.chapter);
  const start = Math.min(Math.max(from, 1), last);
  return { ...state, from: start, to: Math.min(Math.max(to, start), last) };
}

/**
 * One click on a verse chooses it and waits for an end (the anchor); a second click makes the range
 * with it, and the same verse twice keeps just that verse. A click with no anchor starts again.
 */
export function pickVerse(
  state: PickerState,
  anchor: number | null,
  verse: number,
): { state: PickerState; anchor: number | null } {
  if (anchor === null) return { state: chooseVerses(state, verse, verse), anchor: verse };
  return {
    state: chooseVerses(state, Math.min(anchor, verse), Math.max(anchor, verse)),
    anchor: null,
  };
}

const PAGE = 25;

/** A long book's chapters in pages of 25 for the picker's tabs; a short book is one page. */
export function chapterPages(book: Book): { first: number; last: number }[] {
  return Array.from({ length: Math.ceil(book.chapters / PAGE) }, (_, i) => ({
    first: i * PAGE + 1,
    last: Math.min((i + 1) * PAGE, book.chapters),
  }));
}

/** The address of the passage the picker has chosen. */
export function readHref({ version, book, chapter, from, to }: PickerState): string {
  const path = `/bible/${version}/${book}/${chapter}`;
  if (from === null || to === null) return path;
  return `${path}?v=${from === to ? from : `${from}-${to}`}`;
}
