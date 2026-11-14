import { afterEach, describe, expect, it, vi } from "vitest";

// connection() only works inside a request; the route awaits it so Expires is not frozen at build time.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

import { GET } from "@/app/.well-known/security.txt/route";

afterEach(() => vi.useRealTimers());

const fields = async (now = "2026-11-14T10:30:00Z") => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(now));
  const response = await GET();
  const lines = (await response.text()).trimEnd().split("\n");
  return {
    response,
    lines,
    get: (name: string) => lines.find((l) => l.startsWith(`${name}: `))?.slice(name.length + 2),
  };
};

describe("/.well-known/security.txt (RFC 9116)", () => {
  it("is plain UTF-8 text", async () => {
    const { response } = await fields();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });

  it("says who to contact: the same address as SECURITY.md", async () => {
    const { get } = await fields();
    expect(get("Contact")).toBe("mailto:hello@wordonthewater.net");
  });

  it("points at itself and at the security policy", async () => {
    const { get } = await fields();
    expect(get("Canonical")).toBe("https://wordonthewater.net/.well-known/security.txt");
    expect(get("Policy")).toBe(
      "https://github.com/thecodeblock-hendrik/word-on-the-water/blob/main/SECURITY.md",
    );
    expect(get("Preferred-Languages")).toBe("en");
  });

  it("expires within a year of the day it is read, as a date and time in UTC", async () => {
    const { get } = await fields("2026-11-14T10:30:00Z");
    const expires = get("Expires")!;
    expect(expires).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    const days = (Date.parse(expires) - Date.parse("2026-11-14T10:30:00Z")) / 86_400_000;
    expect(days).toBeGreaterThan(300);
    expect(days).toBeLessThan(365);
  });

  it("moves its expiry forward with the date, so it is never stale", async () => {
    const early = (await fields("2026-11-14T10:30:00Z")).get("Expires")!;
    const later = (await fields("2027-06-01T10:30:00Z")).get("Expires")!;
    expect(Date.parse(later)).toBeGreaterThan(Date.parse(early));
  });

  it("has only the plain 'Field: value' lines, and ends with a newline", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T10:30:00Z"));
    const body = await (await GET()).text();
    expect(body.endsWith("\n")).toBe(true);
    expect(
      body
        .trimEnd()
        .split("\n")
        .every((l) => /^[A-Za-z-]+: \S.*$/.test(l)),
    ).toBe(true);
  });
});
