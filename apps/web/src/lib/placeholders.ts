export type Segment = { text: string; placeholder: boolean };
export type Placeholder = { path: string; text: string };

const PLACEHOLDER = /\[[^\]]+\]/g;

/** Splits text so [bracketed] draft copy can be highlighted while it is still in the content. */
export function splitPlaceholders(value: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of value.matchAll(PLACEHOLDER)) {
    if (match.index > last)
      segments.push({ text: value.slice(last, match.index), placeholder: false });
    segments.push({ text: match[0], placeholder: true });
    last = match.index + match[0].length;
  }
  if (last < value.length) segments.push({ text: value.slice(last), placeholder: false });
  return segments;
}

/** Walks content and lists every [placeholder] with where it is. Used by the launch check. */
export function findPlaceholders(content: unknown, path = ""): Placeholder[] {
  if (typeof content === "string") {
    return [...content.matchAll(PLACEHOLDER)].map((m) => ({ path, text: m[0] }));
  }
  if (Array.isArray(content)) {
    return content.flatMap((item, i) => findPlaceholders(item, path ? `${path}.${i}` : `${i}`));
  }
  if (content && typeof content === "object") {
    return Object.entries(content).flatMap(([key, value]) =>
      findPlaceholders(value, path ? `${path}.${key}` : key),
    );
  }
  return [];
}
