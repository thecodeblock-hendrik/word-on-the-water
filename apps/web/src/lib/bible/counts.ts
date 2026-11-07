import bsb from "../../../content/bibles/bsb/counts.json";
import web from "../../../content/bibles/web/counts.json";
import { BOOKS, type Book } from "./books.ts";

/** The last verse of every chapter of every book, per version. No scripture text: safe for the browser. */
const COUNTS: Record<string, number[][]> = { bsb, web };

/** The last verse of a chapter in this version; the BSB's count for a version without its own yet; 0 if there is no such chapter. */
export function lastVerseOf(version: string, book: Book, chapter: number): number {
  const counts = COUNTS[version] ?? COUNTS.bsb;
  return counts[BOOKS.indexOf(book)]?.[chapter - 1] ?? 0;
}
