import { parseVerseRange, type VerseRange } from "./range.ts";
import type { Block, ChapterData, Passage, Run } from "./types.ts";
import { lastVerse } from "./usfm.ts";

const inRange = (run: Run, range: VerseRange) =>
  run.verse !== null && run.verse <= range.to && (run.end ?? run.verse) >= range.from;

/**
 * Keeps the runs inside the range. A heading, title or label stays when the block it introduces
 * starts inside the range; a break stays only between two kept blocks.
 */
function slice(blocks: Block[], range: VerseRange): Block[] {
  const kept: Block[] = [];
  let between: Block[] = [];

  for (const block of blocks) {
    if (!("runs" in block)) {
      between.push(block);
      continue;
    }
    const runs = block.runs.filter((run) => inRange(run, range));
    if (runs.length) {
      const opens = inRange(block.runs[0], range);
      for (const other of between) {
        if (other.kind === "break" ? kept.length > 0 : opens) kept.push(other);
      }
      kept.push({ ...block, runs });
    }
    between = [];
  }
  return kept;
}

/**
 * Picks the verses asked for, such as "16" or "16-18", out of a chapter.
 * Malformed input is rejected. Verses this version does not have (it skips some, or the chapter is
 * shorter) fall back to the whole chapter, with the request kept in `fallback`.
 */
export function selectVerses(data: ChapterData, verses?: string): Passage | "invalid-range" {
  const { version, book, chapter, blocks } = data;
  const last = lastVerse(data);
  const whole = { version, book, chapter, lastVerse: last, range: null, fallback: null, blocks };
  if (verses === undefined) return whole;

  const asked = parseVerseRange(verses, 999);
  if (!asked) return "invalid-range";

  const picked = slice(blocks, asked);
  if (!picked.length) return { ...whole, fallback: asked };
  return { ...whole, blocks: picked, range: { from: asked.from, to: Math.min(asked.to, last) } };
}
