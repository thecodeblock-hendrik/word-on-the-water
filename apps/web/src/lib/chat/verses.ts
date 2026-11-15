import { BOOKS } from "@/lib/bible/books";

const READER_NAMES: Record<string, string> = { Psalm: "Psalms" };
const SLUGS = new Map(BOOKS.map((book) => [book.name, book]));
// "John 3:16", "Romans 3:23–24", "Acts 16:15, 31–34", "Isaiah 53", "Matthew 5–7", "Genesis 1:1–2:3"
const REFERENCE =
  /^((?:[123] )?[A-Za-z]+(?: [A-Za-z]+)*) (\d{1,3})(?:–(\d{1,3}))?(?::(\d{1,3})(?:–(\d{1,3}))?(?=,|$))?/;

/**
 * Where a key verse opens in the Bible reader (World English Bible), or null if it does not parse.
 * One reader address holds one passage, so a reference with several parts links to the first, and
 * one that crosses chapters links to the chapter it starts in. In a one-chapter book ("Jude 3")
 * the number is a verse.
 */
export function verseHref(reference: string, version = "web"): string | null {
  const match = REFERENCE.exec(reference.trim());
  if (!match) return null;
  const [, name, first, second, colonFrom, colonTo] = match;
  const book = SLUGS.get(READER_NAMES[name] ?? name);
  if (!book) return null;
  const verses = book.chapters === 1 && colonFrom === undefined;
  const chapter = verses ? 1 : Number(first);
  const from = verses ? first : colonFrom;
  const to = verses ? second : colonTo;
  if (chapter < 1 || chapter > book.chapters || (from !== undefined && Number(from) < 1)) {
    return null;
  }
  const base = `/bible/${version}/${book.slug}/${chapter}`;
  if (from === undefined) return base;
  return `${base}?v=${to === undefined ? from : `${from}-${to}`}`;
}
