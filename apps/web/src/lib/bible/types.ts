import type { VerseRange } from "./range.ts";

/** Shapes shared by the importer, the local source and the reader. Scripture text only ever lives inside Run.text. */

/** A stretch of text that belongs to one verse. `start` is true where the verse number is shown. */
export type Run = {
  /** First verse of the label, or null for text before the first verse of a chapter. */
  verse: number | null;
  /** Last verse of a combined label such as "3-4", otherwise null. */
  end: number | null;
  start: boolean;
  text: string;
};

export type TextBlock = {
  kind: "paragraph" | "poetry" | "list";
  indent: number;
  runs: Run[];
};

export type Block =
  | TextBlock
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  /** A Psalm title: shown above the psalm, not numbered. */
  | { kind: "title"; text: string }
  /** A speaker name or an acrostic letter. */
  | { kind: "label"; text: string }
  | { kind: "break" };

export type Chapter = { chapter: number; blocks: Block[] };

/** One chapter as stored in content/bibles/<version>/<book>/<chapter>.json. */
export type ChapterData = { version: string; book: string; chapter: number; blocks: Block[] };

/** What the reader shows: one chapter, or some verses of it. */
export type Passage = {
  version: string;
  book: string;
  chapter: number;
  /** The verses shown, or null when the whole chapter is shown. */
  range: VerseRange | null;
  /** The verses asked for when this version does not have them and the whole chapter is shown instead. */
  fallback: VerseRange | null;
  /** The last verse of the whole chapter in this version. */
  lastVerse: number;
  blocks: Block[];
};

/** Where chapters come from: our generated files, or later the ESV API. */
export interface BibleSource {
  getChapter(version: string, book: string, chapter: number): Promise<ChapterData>;
}
