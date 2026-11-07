import { formatReference } from "../scripture.ts";
import type { Book } from "./books.ts";
import type { VerseRange } from "./range.ts";

/** "16" for one verse, "16–18" for a range (en dash). */
export function verseLabel({ from, to }: VerseRange): string {
  return from === to ? `${from}` : `${from}–${to}`;
}

/** "John 3", "John 3:16" or "John 3:16–18". */
export function passageTitle(book: Book, chapter: number, range: VerseRange | null): string {
  return formatReference({
    book: book.name,
    chapter,
    verses: range ? verseLabel(range) : undefined,
  });
}
