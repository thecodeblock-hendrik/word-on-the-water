import { parse as parseYaml } from "yaml";

import { goDeeperItems } from "./blocks.ts";
import { type DevotionalMeta, metaSchema, OPTIONAL_SECTIONS, SECTIONS } from "./schema.ts";

export type Section = { heading: string; markdown: string };

export type Devotional = {
  slug: string;
  meta: DevotionalMeta;
  sections: Section[];
  readMinutes: number;
};

const WORDS_PER_MINUTE = 200;

/** Split a devotional.md file into its header and body, and check both. Throws one readable error. */
export function parseDevotional(source: string, slug: string): Devotional {
  const file = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!file) fail(slug, ["The file must start with a header block between --- lines."]);
  const [, header, body] = file!;

  const result = metaSchema.safeParse(parseYaml(header));
  if (!result.success) {
    fail(
      slug,
      result.error.issues.map((i) => `${i.path.join(".") || "header"}: ${i.message}`),
    );
  }

  const sections = splitSections(body, slug);
  const deeper = sections.find((s) => s.heading === "Go Deeper");
  if (deeper) {
    try {
      goDeeperItems(deeper.markdown);
    } catch (error) {
      fail(slug, [(error as Error).message]);
    }
  }
  const words = sections.reduce((n, s) => n + s.markdown.split(/\s+/).filter(Boolean).length, 0);
  return {
    slug,
    meta: result.data!,
    sections,
    readMinutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
  };
}

function splitSections(body: string, slug: string): Section[] {
  const marks = [...body.matchAll(/^## (.+?)\s*$/gm)];
  const problems: string[] = [];

  const before = body.slice(0, marks[0]?.index ?? body.length).trim();
  if (before) problems.push("There is text before the first section heading.");

  const sections = marks.map((m, i) => ({
    heading: m[1],
    markdown: body.slice(m.index + m[0].length, marks[i + 1]?.index ?? body.length).trim(),
  }));

  let last = -1;
  for (const { heading } of sections) {
    const at = (SECTIONS as readonly string[]).indexOf(heading);
    if (at < 0) problems.push(`Unknown section "${heading}".`);
    else if (at < last) problems.push(`Section "${heading}" is out of order.`);
    else last = at;
  }
  for (const name of SECTIONS) {
    if (!OPTIONAL_SECTIONS.includes(name) && !sections.some((s) => s.heading === name)) {
      problems.push(`Missing section "${name}".`);
    }
  }
  if (problems.length > 0) {
    fail(slug, [...problems, `Sections, in order: ${SECTIONS.join(", ")}.`]);
  }
  return sections;
}

function fail(slug: string, problems: string[]): never {
  throw new Error(`Devotional "${slug}":\n  ${problems.join("\n  ")}`);
}
