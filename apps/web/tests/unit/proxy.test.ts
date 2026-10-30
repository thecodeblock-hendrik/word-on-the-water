import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

const run = () => proxy(new NextRequest("http://localhost:3000/"));
const nonceOf = (csp: string | null) => /'nonce-([^']+)'/.exec(csp ?? "")?.[1];

const cspFor = (url: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(url, { headers })).headers.get("content-security-policy") ?? "";

describe("proxy upgrade-insecure-requests", () => {
  it("is omitted for plain http (WebKit would rewrite localhost assets to https and fail)", () => {
    expect(cspFor("http://localhost:3000/")).not.toContain("upgrade-insecure-requests");
  });

  it("is sent for https requests", () => {
    expect(cspFor("https://example.com/")).toContain("upgrade-insecure-requests");
  });

  it("is sent when a proxy reports https via x-forwarded-proto", () => {
    const csp = cspFor("http://internal/", { "x-forwarded-proto": "https" });
    expect(csp).toContain("upgrade-insecure-requests");
  });
});

describe("proxy", () => {
  it("sets a CSP carrying a nonce on the response", () => {
    const csp = run().headers.get("content-security-policy");
    expect(nonceOf(csp)).toBeTruthy();
  });

  it("generates a different nonce for every request", () => {
    const first = nonceOf(run().headers.get("content-security-policy"));
    const second = nonceOf(run().headers.get("content-security-policy"));
    expect(first).not.toBe(second);
  });

  it("uses a nonce long enough to be unguessable", () => {
    const nonce = nonceOf(run().headers.get("content-security-policy")) ?? "";
    expect(Buffer.from(nonce, "base64").length).toBeGreaterThanOrEqual(16);
  });

  it("passes the same nonce to the app via the request headers", () => {
    const response = run();
    const forwarded = response.headers.get("x-middleware-request-x-nonce");
    expect(forwarded).toBe(nonceOf(response.headers.get("content-security-policy")));
  });
});
