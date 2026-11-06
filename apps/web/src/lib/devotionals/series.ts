import { parse as parseYaml } from "yaml";
import { z } from "zod";

const outlineEntry = z.strictObject({
  number: z.number().int().min(1),
  title: z.string().min(1),
  passage: z.string().min(1),
  date: z.iso.date(),
});

/** The series.yml file: what a series is called and its planned weeks. */
const seriesSchema = z
  .strictObject({
    title: z.string().min(1),
    tagline: z.string().min(1),
    artAlt: z.string().min(1),
    outline: z.array(outlineEntry).min(1),
  })
  .refine((s) => s.outline.every((o, i) => o.number === i + 1), {
    path: ["outline"],
    message: "numbers must count 1, 2, 3 in order",
  });

export type OutlineEntry = z.infer<typeof outlineEntry>;
export type Series = z.infer<typeof seriesSchema> & { slug: string };

export const SERIES_ART = ["art-dawn-patrol.png", "art-night-swell.png"] as const;

/** Read and check the text of a series.yml file. Throws one readable error. */
export function parseSeries(source: string, slug: string): Series {
  const result = seriesSchema.safeParse(parseYaml(source));
  if (!result.success) {
    const problems = result.error.issues.map(
      (i) => `${i.path.join(".") || "series"}: ${i.message}`,
    );
    throw new Error(`Series "${slug}":\n  ${problems.join("\n  ")}`);
  }
  return { slug, ...result.data };
}

/** "Advent · 1 of 5". */
export function seriesPosition(series: Series, number: number): string {
  return `${series.title} · ${number} of ${series.outline.length}`;
}
