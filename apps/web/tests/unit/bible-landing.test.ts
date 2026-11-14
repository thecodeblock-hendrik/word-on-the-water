import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let jar: Record<string, string> = {};
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name in jar ? { value: jar[name] } : undefined),
  }),
}));

import BiblePage from "@/app/bible/page";

beforeEach(() => {
  jar = {};
  vi.stubEnv("BIBLE_ENABLED", "1");
});
afterEach(() => vi.unstubAllEnvs());

/** Where /bible sends the visitor: the target of the redirect it throws. */
async function landing(): Promise<string> {
  const thrown = await BiblePage().then(
    () => undefined,
    (error: { digest?: string }) => error,
  );
  const match = /^NEXT_REDIRECT;[a-z]+;(.+?);\d{3};?$/.exec(thrown?.digest ?? "");
  if (!match) throw new Error(`Expected a redirect, got ${thrown?.digest ?? "no error"}`);
  return match[1];
}

describe("/bible opens on John 3:16", () => {
  it("a first visit opens John 3:16 in the BSB", async () => {
    expect(await landing()).toBe("/bible/bsb/john/3?v=16");
  });

  it("opens John 3:16 in the version you read last", async () => {
    jar["bible-version"] = "web";
    expect(await landing()).toBe("/bible/web/john/3?v=16");
  });

  it.each(["esv", "kjv", "..%2F..%2Fweb", "web%3Bpath"])(
    "an unavailable version or forged cookie (%s) opens the BSB",
    async (value) => {
      jar["bible-version"] = value;
      expect(await landing()).toBe("/bible/bsb/john/3?v=16");
    },
  );

  it("resumes the passage you read last, a verse range, one verse or a whole chapter", async () => {
    jar["bible-passage"] = "romans.8.28-30";
    expect(await landing()).toBe("/bible/bsb/romans/8?v=28-30");
    jar["bible-passage"] = "john.3.16";
    expect(await landing()).toBe("/bible/bsb/john/3?v=16");
    jar["bible-passage"] = "mark.1";
    expect(await landing()).toBe("/bible/bsb/mark/1");
  });

  it("resumes in the version you read last", async () => {
    jar["bible-version"] = "web";
    jar["bible-passage"] = "psalms.23";
    expect(await landing()).toBe("/bible/web/psalms/23");
  });

  it.each(["nope.1", "john.99", "john.3.18-16", "john.3;path=/", "..%2F..%2Fweb.1"])(
    "a forged or broken passage cookie (%s) opens John 3:16",
    async (value) => {
      jar["bible-passage"] = value;
      expect(await landing()).toBe("/bible/bsb/john/3?v=16");
    },
  );

  it("is a 404 while the Bible reader is switched off", async () => {
    vi.stubEnv("BIBLE_ENABLED", "");
    await expect(BiblePage()).rejects.toMatchObject({
      digest: expect.stringMatching(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/),
    });
  });
});
