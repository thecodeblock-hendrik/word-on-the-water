import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { BibleSource } from "./types.ts";

export const BIBLES_DIR = join(process.cwd(), "content", "bibles");

/** Reads the chapter files made by `pnpm build:bible`. Callers pass only checked version, book and chapter. */
export function localSource(root: string = BIBLES_DIR): BibleSource {
  return {
    async getChapter(version, book, chapter) {
      const file = join(/* turbopackIgnore: true */ root, version, book, `${chapter}.json`);
      return JSON.parse(await readFile(file, "utf8"));
    },
  };
}
