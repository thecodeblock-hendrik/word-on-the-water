import { z } from "zod";

/** The body sections, in the order they must appear. Go Deeper may be left out. */
export const SECTIONS = ["The Lineup", "The Word", "Paddle Out", "Pray", "Go Deeper"] as const;
export const OPTIONAL_SECTIONS: readonly string[] = ["Go Deeper"];

const quote = z.strictObject({ text: z.string().min(1), ref: z.string().min(1) });

/** The header block of a devotional.md file. Unknown fields are rejected to catch typos. */
export const metaSchema = z.strictObject({
  title: z.string().min(2).max(60),
  publishAt: z.iso.date(),
  author: z.string().min(1),
  series: z.string().regex(/^[a-z0-9-]+$/, "must be the series folder name, such as advent"),
  seriesNumber: z.number().int().min(1),
  passages: z.array(z.string().regex(/\d/, "needs a chapter number")).min(1),
  summary: z.string().min(1).max(200),
  emailSubject: z.string().min(1).max(80),
  tags: z.array(z.string().min(1)).min(1),
  conditions: z.array(quote).min(1),
  reportConditions: z.string().min(1).max(30),
  keyVerse: quote,
  imageAlt: z.string().min(1),
  sharePrompt: z.string().min(1).max(80).optional(),
});

export type DevotionalMeta = z.infer<typeof metaSchema>;
