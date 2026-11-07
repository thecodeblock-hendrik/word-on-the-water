import { ESV_NOTICE } from "../scripture.ts";

export type BibleVersion = {
  /** URL segment, for example "bsb". */
  id: string;
  name: string;
  /** Short label for chips and tabs. */
  short: string;
  /** One plain-language line for the version picker. */
  description: string;
  /** The credit shown under the text. For the ESV this is the full Crossway notice. */
  credit: string;
  /** "files" reads our generated chapter files; "esv-api" calls the ESV API. */
  source: "files" | "esv-api";
  /** Disabled versions show as "Coming soon" and their pages return 404. */
  enabled: boolean;
};

export const VERSIONS: readonly BibleVersion[] = [
  {
    id: "bsb",
    name: "Berean Standard Bible",
    short: "BSB",
    description: "Modern English, easy to read. Public domain.",
    credit: "Berean Standard Bible (BSB), dedicated to the public domain.",
    source: "files",
    enabled: true,
  },
  {
    id: "web",
    name: "World English Bible",
    short: "WEB",
    description: "Modern English, classic style. Public domain.",
    credit: "World English Bible (WEB), public domain.",
    source: "files",
    enabled: true,
  },
  {
    id: "esv",
    name: "English Standard Version",
    short: "ESV",
    description: "Not available yet. We are waiting for approval.",
    credit: ESV_NOTICE,
    source: "esv-api",
    enabled: false,
  },
];

export const DEFAULT_VERSION = "bsb";

export function findVersion(id: string): BibleVersion | undefined {
  return VERSIONS.find((version) => version.id === id);
}

export function enabledVersions(): BibleVersion[] {
  return VERSIONS.filter((version) => version.enabled);
}
