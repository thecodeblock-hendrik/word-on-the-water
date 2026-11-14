import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let versionCookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "bible-version" && versionCookie !== undefined
        ? { value: versionCookie }
        : undefined,
  }),
}));

import BiblePage from "@/app/bible/page";

beforeEach(() => {
  versionCookie = undefined;
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
    versionCookie = "web";
    expect(await landing()).toBe("/bible/web/john/3?v=16");
  });

  it.each(["esv", "kjv", "..%2F..%2Fweb", "web%3Bpath"])(
    "an unavailable version or forged cookie (%s) opens the BSB",
    async (value) => {
      versionCookie = value;
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
