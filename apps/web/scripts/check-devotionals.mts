import { loadContent } from "../src/lib/devotionals/load.ts";

try {
  const { devotionals: all, series } = loadContent();
  for (const d of all) {
    console.log(`${d.meta.publishAt}  ${d.slug}  (${d.readMinutes} min)`);
  }
  console.log(`${all.length} devotional(s) and ${series.length} series are valid.`);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
