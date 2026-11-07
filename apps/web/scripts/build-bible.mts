import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { importVersion } from "../src/lib/bible/import.ts";

const [version, source] = process.argv.slice(2);
if (!version || !/^[a-z]+$/.test(version) || !source) {
  console.error(
    "Usage: pnpm build:bible <version, for example bsb or web> <folder with the unzipped USFM files>",
  );
  process.exit(1);
}

const output = join(import.meta.dirname, "../content/bibles");

try {
  const files = readdirSync(source).filter((name) => name.endsWith(".usfm"));
  const chapters = importVersion(version, files, (name) =>
    readFileSync(join(source, name), "utf8"),
  );

  rmSync(join(output, version), { recursive: true, force: true });
  for (const { path, data } of chapters) {
    const target = join(output, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(data)}\n`);
  }
  console.log(`${version}: wrote ${chapters.length} chapters to content/bibles/${version}`);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
