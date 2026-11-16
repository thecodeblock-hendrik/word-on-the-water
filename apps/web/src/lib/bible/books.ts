/** The 66 books of the Bible: names, URL slugs and chapter counts. No scripture text lives here. */

export type Testament = "old" | "new";

export type Book = {
  name: string;
  /** URL segment, for example "john" or "1-john". */
  slug: string;
  /** The standard short form (SBL style), for narrow buttons: "Matt", "1 Thess". */
  short: string;
  testament: Testament;
  chapters: number;
};

export type ChapterRef = { book: string; chapter: number };

const OLD_TESTAMENT: ReadonlyArray<readonly [string, number]> = [
  ["Genesis", 50],
  ["Exodus", 40],
  ["Leviticus", 27],
  ["Numbers", 36],
  ["Deuteronomy", 34],
  ["Joshua", 24],
  ["Judges", 21],
  ["Ruth", 4],
  ["1 Samuel", 31],
  ["2 Samuel", 24],
  ["1 Kings", 22],
  ["2 Kings", 25],
  ["1 Chronicles", 29],
  ["2 Chronicles", 36],
  ["Ezra", 10],
  ["Nehemiah", 13],
  ["Esther", 10],
  ["Job", 42],
  ["Psalms", 150],
  ["Proverbs", 31],
  ["Ecclesiastes", 12],
  ["Song of Solomon", 8],
  ["Isaiah", 66],
  ["Jeremiah", 52],
  ["Lamentations", 5],
  ["Ezekiel", 48],
  ["Daniel", 12],
  ["Hosea", 14],
  ["Joel", 3],
  ["Amos", 9],
  ["Obadiah", 1],
  ["Jonah", 4],
  ["Micah", 7],
  ["Nahum", 3],
  ["Habakkuk", 3],
  ["Zephaniah", 3],
  ["Haggai", 2],
  ["Zechariah", 14],
  ["Malachi", 4],
];

const NEW_TESTAMENT: ReadonlyArray<readonly [string, number]> = [
  ["Matthew", 28],
  ["Mark", 16],
  ["Luke", 24],
  ["John", 21],
  ["Acts", 28],
  ["Romans", 16],
  ["1 Corinthians", 16],
  ["2 Corinthians", 13],
  ["Galatians", 6],
  ["Ephesians", 6],
  ["Philippians", 4],
  ["Colossians", 4],
  ["1 Thessalonians", 5],
  ["2 Thessalonians", 3],
  ["1 Timothy", 6],
  ["2 Timothy", 4],
  ["Titus", 3],
  ["Philemon", 1],
  ["Hebrews", 13],
  ["James", 5],
  ["1 Peter", 5],
  ["2 Peter", 3],
  ["1 John", 5],
  ["2 John", 1],
  ["3 John", 1],
  ["Jude", 1],
  ["Revelation", 22],
];

const SHORT_NAMES: Readonly<Record<string, string>> = {
  Genesis: "Gen",
  Exodus: "Exod",
  Leviticus: "Lev",
  Numbers: "Num",
  Deuteronomy: "Deut",
  Joshua: "Josh",
  Judges: "Judg",
  Ruth: "Ruth",
  "1 Samuel": "1 Sam",
  "2 Samuel": "2 Sam",
  "1 Kings": "1 Kgs",
  "2 Kings": "2 Kgs",
  "1 Chronicles": "1 Chr",
  "2 Chronicles": "2 Chr",
  Ezra: "Ezra",
  Nehemiah: "Neh",
  Esther: "Esth",
  Job: "Job",
  Psalms: "Ps",
  Proverbs: "Prov",
  Ecclesiastes: "Eccl",
  "Song of Solomon": "Song",
  Isaiah: "Isa",
  Jeremiah: "Jer",
  Lamentations: "Lam",
  Ezekiel: "Ezek",
  Daniel: "Dan",
  Hosea: "Hos",
  Joel: "Joel",
  Amos: "Amos",
  Obadiah: "Obad",
  Jonah: "Jonah",
  Micah: "Mic",
  Nahum: "Nah",
  Habakkuk: "Hab",
  Zephaniah: "Zeph",
  Haggai: "Hag",
  Zechariah: "Zech",
  Malachi: "Mal",
  Matthew: "Matt",
  Mark: "Mark",
  Luke: "Luke",
  John: "John",
  Acts: "Acts",
  Romans: "Rom",
  "1 Corinthians": "1 Cor",
  "2 Corinthians": "2 Cor",
  Galatians: "Gal",
  Ephesians: "Eph",
  Philippians: "Phil",
  Colossians: "Col",
  "1 Thessalonians": "1 Thess",
  "2 Thessalonians": "2 Thess",
  "1 Timothy": "1 Tim",
  "2 Timothy": "2 Tim",
  Titus: "Titus",
  Philemon: "Phlm",
  Hebrews: "Heb",
  James: "Jas",
  "1 Peter": "1 Pet",
  "2 Peter": "2 Pet",
  "1 John": "1 John",
  "2 John": "2 John",
  "3 John": "3 John",
  Jude: "Jude",
  Revelation: "Rev",
};

const toBooks = (rows: typeof OLD_TESTAMENT, testament: Testament): Book[] =>
  rows.map(([name, chapters]) => ({
    name,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    short: SHORT_NAMES[name],
    testament,
    chapters,
  }));

export const BOOKS: readonly Book[] = [
  ...toBooks(OLD_TESTAMENT, "old"),
  ...toBooks(NEW_TESTAMENT, "new"),
];

const BY_SLUG = new Map(BOOKS.map((book) => [book.slug, book]));

export function findBook(slug: string): Book | undefined {
  return BY_SLUG.get(slug);
}

export function hasChapter(book: Book, chapter: number): boolean {
  return Number.isInteger(chapter) && chapter >= 1 && chapter <= book.chapters;
}

/** The chapters before and after this one, crossing book boundaries; null at either end of the Bible. */
export function neighbours(
  book: Book,
  chapter: number,
): { previous: ChapterRef | null; next: ChapterRef | null } {
  const index = BOOKS.indexOf(book);
  const before = BOOKS[index - 1];
  const after = BOOKS[index + 1];

  const previous =
    chapter > 1
      ? { book: book.slug, chapter: chapter - 1 }
      : before
        ? { book: before.slug, chapter: before.chapters }
        : null;

  const next =
    chapter < book.chapters
      ? { book: book.slug, chapter: chapter + 1 }
      : after
        ? { book: after.slug, chapter: 1 }
        : null;

  return { previous, next };
}
