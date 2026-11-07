export type VerseRange = { from: number; to: number };

const RANGE = /^(\d{1,3})(?:[-–](\d{1,3}))?$/;

/**
 * Parses "16" or "16-18" (hyphen or en dash) for a chapter whose last verse is `lastVerse`.
 * Returns null for anything else, so callers can show the whole chapter or a 404.
 */
export function parseVerseRange(input: string, lastVerse: number): VerseRange | null {
  const match = RANGE.exec(input);
  if (!match) return null;

  const from = Number(match[1]);
  const to = match[2] === undefined ? from : Number(match[2]);
  if (from < 1 || to < from || to > lastVerse) return null;

  return { from, to };
}
