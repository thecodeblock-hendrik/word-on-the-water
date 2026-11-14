/** The inline marks in devotional text: **bold**, *italic*, ^5^ verse numbers and LORD. */
export const INLINE_MARKS = /(\*\*[^*]+\*\*|\*[^*]+\*|\^\d+\^|\bLORD\b)/;

export type Block = { kind: "paragraph" | "quote"; text: string };
export type GoDeeperItem = { term: string; text: string };

/** Split section text into paragraphs. A paragraph starting with > is a pull quote. */
export function splitBlocks(markdown: string): Block[] {
  return markdown
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean)
    .map((chunk) =>
      chunk.startsWith("> ")
        ? { kind: "quote", text: chunk.slice(2) }
        : { kind: "paragraph", text: chunk },
    );
}

/** Read the Go Deeper section: one "**Label:** text" paragraph per item. */
export function goDeeperItems(markdown: string): GoDeeperItem[] {
  return splitBlocks(markdown).map(({ text }) => {
    const item = text.match(/^\*\*(.+?):\*\*\s+(.+)$/);
    if (!item) {
      throw new Error(
        `Go Deeper paragraphs must look like "**Label:** text", but found "${text.slice(0, 40)}".`,
      );
    }
    return { term: item[1], text: item[2] };
  });
}

/** Separate a closing "Amen." from a prayer so it can be styled. */
export function splitAmen(prayer: string): { body: string; amen: string | undefined } {
  const found = prayer.trim().match(/^([\s\S]*?)\s*(Amen\.)$/);
  return found ? { body: found[1], amen: found[2] } : { body: prayer.trim(), amen: undefined };
}
