import { findBook, hasChapter } from "./books.ts";
import { DEFAULT_VERSION, findVersion } from "./versions.ts";

export const VERSION_COOKIE = "bible-version";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** The remembered version if it is one we offer and have turned on, otherwise the default. */
export function parseVersion(value: string | undefined): string {
  return value && findVersion(value)?.enabled ? value : DEFAULT_VERSION;
}

/** A first-party preference cookie, like the theme one: Lax, a year, Secure only over https. */
export function versionCookie(id: string, secure: boolean): string {
  return `${VERSION_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export const PASSAGE_COOKIE = "bible-passage";

/** What the visitor was reading: a book, a chapter, and the verses chosen (null for the whole chapter). */
export type Passage = { book: string; chapter: number; from: number | null; to: number | null };

/** Where a first visit opens, and where an unreadable cookie falls back to. */
export const FIRST_PASSAGE: Passage = { book: "john", chapter: 3, from: 16, to: 16 };

// "john.3", "john.3.16" or "romans.8.28-30": plain numbers only, so nothing forged gets through.
const PASSAGE = /^([a-z0-9-]+)\.([1-9]\d{0,2})(?:\.([1-9]\d{0,2})(?:-([1-9]\d{0,2}))?)?$/;

/** The remembered passage if it names a real book and chapter, otherwise John 3:16. */
export function parsePassage(value: string | undefined): Passage {
  const match = value ? PASSAGE.exec(value) : null;
  if (!match) return FIRST_PASSAGE;
  const [, slug, chapterText, fromText, toText] = match;
  const book = findBook(slug);
  const chapter = Number(chapterText);
  if (!book || !hasChapter(book, chapter)) return FIRST_PASSAGE;
  if (fromText === undefined) return { book: slug, chapter, from: null, to: null };
  const from = Number(fromText);
  const to = toText === undefined ? from : Number(toText);
  return to >= from ? { book: slug, chapter, from, to } : FIRST_PASSAGE;
}

/** The cookie value for a passage: "john.3", "john.3.16" or "romans.8.28-30". */
export function passageValue({ book, chapter, from, to }: Passage): string {
  if (from === null || to === null) return `${book}.${chapter}`;
  return `${book}.${chapter}.${from === to ? from : `${from}-${to}`}`;
}

/** The same kind of first-party preference cookie as the version one. */
export function passageCookie(passage: Passage, secure: boolean): string {
  return `${PASSAGE_COOKIE}=${passageValue(passage)}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
