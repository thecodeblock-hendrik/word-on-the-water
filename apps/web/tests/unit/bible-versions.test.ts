import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ESV_NOTICE } from "@/lib/scripture";
import { DEFAULT_VERSION, enabledVersions, findVersion, VERSIONS } from "@/lib/bible/versions";

describe("VERSIONS", () => {
  it("lists the BSB first, the WEB second and the ESV third", () => {
    expect(VERSIONS.map((v) => v.id)).toEqual(["bsb", "web", "esv"]);
  });

  it("turns the BSB and WEB on and keeps the ESV off until its API key is live", () => {
    expect(findVersion("bsb")?.enabled).toBe(true);
    expect(findVersion("web")?.enabled).toBe(true);
    expect(findVersion("esv")?.enabled).toBe(false);
  });

  it("gives every version a name, short name, description and credit", () => {
    for (const version of VERSIONS) {
      for (const field of [version.name, version.short, version.description, version.credit]) {
        expect(field.length, version.id).toBeGreaterThan(0);
      }
      expect(version.short, version.id).toBe(version.short.toUpperCase());
    }
  });

  it("uses URL-safe ids", () => {
    for (const version of VERSIONS) expect(version.id).toMatch(/^[a-z]+$/);
  });

  it("credits the public-domain versions as such and carries the full Crossway notice for the ESV", () => {
    expect(findVersion("bsb")?.credit).toMatch(/public domain/i);
    expect(findVersion("web")?.credit).toMatch(/public domain/i);
    expect(findVersion("esv")?.credit).toBe(ESV_NOTICE);
  });

  it("reads the BSB and WEB from files we hold, and the ESV from the API", () => {
    expect(findVersion("bsb")?.source).toBe("files");
    expect(findVersion("web")?.source).toBe("files");
    expect(findVersion("esv")?.source).toBe("esv-api");
  });

  it("has generated data for every version that reads files", () => {
    for (const version of VERSIONS.filter((v) => v.source === "files")) {
      const folder = fileURLToPath(new URL(`../../content/bibles/${version.id}`, import.meta.url));
      expect(existsSync(folder), version.id).toBe(true);
    }
  });
});

describe("findVersion", () => {
  it("returns undefined for an unknown id and is exact about case", () => {
    expect(findVersion("kjv")).toBeUndefined();
    expect(findVersion("BSB")).toBeUndefined();
    expect(findVersion("")).toBeUndefined();
  });
});

describe("enabledVersions and DEFAULT_VERSION", () => {
  it("lists only enabled versions, in order", () => {
    expect(enabledVersions().map((v) => v.id)).toEqual(["bsb", "web"]);
  });

  it("defaults to the BSB, which is enabled", () => {
    expect(DEFAULT_VERSION).toBe("bsb");
    expect(enabledVersions().some((v) => v.id === DEFAULT_VERSION)).toBe(true);
  });
});
