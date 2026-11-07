import type { Block, Chapter, TextBlock } from "./types";

/**
 * Reads one book of USFM (the format of the BSB and WEB downloads) into chapters of blocks.
 * Footnotes, cross-references and Strong's numbers are dropped; the words are never changed.
 */

const FOOTNOTE = /\\[fx] [\s\S]*?\\[fx]\*/g;
const WORD_TAG = /\\\+?w ([^|\\]*)(?:\|[^\\]*)?\\\+?w\*/g;
const ANY_MARKER = /\\\+?[a-z]+\d*\*?/g;
const VERSE = /\\v (\d+)(?:-(\d+))?\s*/;
const LINE = /^\\(\+?[a-z]+\d*)\*?(?:\s+(.*))?$/;
const INLINE = /^(v|\+?w|wj|qs|k|bk|nd|add|tl|em|it|bd|sc)$/;

const HEADINGS: Record<string, 1 | 2 | 3> = { ms: 1, ms1: 1, s: 2, s1: 2, s2: 3, s3: 3 };

function textKind(marker: string): { kind: TextBlock["kind"]; indent: number } | null {
  if (/^(p|pmo|pc|m|mi|nb|po|pm)$/.test(marker))
    return { kind: "paragraph", indent: marker === "mi" ? 1 : 0 };
  if (/^pi\d?$/.test(marker)) return { kind: "paragraph", indent: Number(marker.slice(2)) || 1 };
  if (/^q\d?$/.test(marker)) return { kind: "poetry", indent: Number(marker.slice(1)) || 1 };
  if (marker === "qr") return { kind: "poetry", indent: 2 };
  if (/^li\d?$/.test(marker)) return { kind: "list", indent: Number(marker.slice(2)) || 1 };
  return null;
}

function clean(text: string): string {
  return text.replace(WORD_TAG, "$1").replace(ANY_MARKER, "").replace(/\s+/g, " ").trim();
}

export function parseUsfm(source: string): Chapter[] {
  const chapters: Chapter[] = [];
  let blocks: Block[] = [];
  let block: TextBlock | null = null;
  let verse: number | null = null;
  let end: number | null = null;
  let pending = false;

  const setVerse = (n: string, to?: string) => {
    verse = Number(n);
    end = to ? Number(to) : null;
    pending = true;
  };

  const addRun = (text: string) => {
    if (!text || !block) return;
    const last = block.runs.at(-1);
    if (last && !pending && last.verse === verse && last.end === end) last.text += ` ${text}`;
    else block.runs.push({ verse, end, start: pending, text });
    pending = false;
  };

  const addContent = (content: string) => {
    block ??= openBlock("paragraph", 0);
    const [first, ...rest] = content.split(new RegExp(VERSE.source, "g"));
    addRun(clean(first));
    for (let i = 0; i < rest.length; i += 3) {
      setVerse(rest[i], rest[i + 1]);
      addRun(clean(rest[i + 2]));
    }
  };

  const openBlock = (kind: TextBlock["kind"], indent: number): TextBlock => {
    block = { kind, indent, runs: [] };
    blocks.push(block);
    return block;
  };

  const push = (next: Block) => {
    block = null;
    if (!("text" in next) || next.text) blocks.push(next);
  };

  const closeChapter = () => {
    const last = chapters.at(-1);
    if (last) last.blocks = last.blocks.filter((b) => !("runs" in b) || b.runs.length > 0);
  };

  for (const line of source.replace(FOOTNOTE, "").split(/\r?\n/)) {
    const match = LINE.exec(line.trim());
    const marker = match ? match[1] : null;
    const content = match ? (match[2] ?? "") : line;

    if (marker === "c") {
      closeChapter();
      blocks = [];
      block = null;
      verse = end = null;
      pending = false;
      chapters.push({ chapter: parseInt(content, 10), blocks });
    } else if (!chapters.length) {
      continue;
    } else if (marker === null || INLINE.test(marker)) {
      if (line.trim()) addContent(match ? line.trim() : line);
    } else if (marker in HEADINGS) {
      push({ kind: "heading", level: HEADINGS[marker], text: clean(content) });
    } else if (marker === "d") {
      const v = VERSE.exec(content);
      if (v) setVerse(v[1], v[2]);
      push({ kind: "title", text: clean(v ? content.slice(v[0].length) : content) });
    } else if (marker === "sp" || marker === "qa") {
      push({ kind: "label", text: clean(content) });
    } else if (marker === "b") {
      push({ kind: "break" });
    } else if (textKind(marker)) {
      const { kind, indent } = textKind(marker)!;
      openBlock(kind, indent);
      addContent(content);
    }
  }
  closeChapter();
  return chapters;
}

/** Every verse number in a chapter in order, with combined labels such as 3-4 expanded. */
export function verseNumbers(chapter: Chapter): number[] {
  const numbers = new Set<number>();
  for (const block of chapter.blocks) {
    if (!("runs" in block)) continue;
    for (const run of block.runs) {
      if (run.start && run.verse !== null) {
        for (let v = run.verse; v <= (run.end ?? run.verse); v++) numbers.add(v);
      }
    }
  }
  return [...numbers].sort((a, b) => a - b);
}

export function lastVerse(chapter: Chapter): number {
  return verseNumbers(chapter).at(-1) ?? 0;
}
