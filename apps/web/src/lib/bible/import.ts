import { BOOKS, type Book } from "./books.ts";
import type { ChapterData } from "./types.ts";
import { parseUsfm, verseNumbers } from "./usfm.ts";
import { USFM_CODES } from "./usfm-codes.ts";

export type ChapterFile = {
  /** Path under content/bibles, for example "bsb/john/3.json". */
  path: string;
  data: ChapterData;
};

/** Finds a book's file by its USFM code: "JHN.usfm" (BSB) or "73-JHNengwebp.usfm" (WEB). */
export function findBookFile(files: readonly string[], code: string): string {
  const file = files.find(
    (name) => name === `${code}.usfm` || new RegExp(`^\\d+-${code}[a-zA-Z-]*\\.usfm$`).test(name),
  );
  if (!file) throw new Error(`No USFM file for ${code}`);
  return file;
}

function checkOrder(book: Book, data: ChapterData): void {
  const where = `${book.name} ${data.chapter}`;
  if (!verseNumbers(data).length) throw new Error(`${where}: no verses`);

  let highest = 0;
  for (const block of data.blocks) {
    if (!("runs" in block)) continue;
    for (const run of block.runs) {
      if (!run.start || run.verse === null) continue;
      if (run.verse <= highest)
        throw new Error(`${where}: verse ${run.verse} after verse ${highest}`);
      highest = run.end ?? run.verse;
    }
  }
}

/** Turns one book of USFM into one file per chapter, checking it against the book table. */
export function importBook(version: string, book: Book, source: string): ChapterFile[] {
  const chapters = parseUsfm(source);
  const numbered = chapters.every((c, i) => c.chapter === i + 1);
  if (chapters.length !== book.chapters || !numbered) {
    throw new Error(`${book.name}: expected ${book.chapters} chapters, found ${chapters.length}`);
  }

  return chapters.map(({ chapter, blocks }) => {
    const data: ChapterData = { version, book: book.slug, chapter, blocks };
    checkOrder(book, data);
    return { path: `${version}/${book.slug}/${chapter}.json`, data };
  });
}

/** Imports all 66 books. Every file is found before any is read, so a missing book fails fast. */
export function importVersion(
  version: string,
  files: readonly string[],
  read: (file: string) => string,
): ChapterFile[] {
  const located = BOOKS.map((book, i) => ({ book, file: findBookFile(files, USFM_CODES[i]) }));
  return located.flatMap(({ book, file }) => importBook(version, book, read(file)));
}
