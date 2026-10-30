import { describe, expect, it } from "vitest";

import { buildCsp } from "@/lib/csp";

const directive = (csp: string, name: string) =>
  csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));

describe("buildCsp (production)", () => {
  const csp = buildCsp({ nonce: "abc123", isDev: false });

  it("allows scripts only by nonce, strict-dynamic and Turnstile", () => {
    expect(directive(csp, "script-src")).toBe(
      "script-src 'self' 'nonce-abc123' 'strict-dynamic' https://challenges.cloudflare.com",
    );
  });

  it("never allows inline or eval scripts", () => {
    const scripts = directive(csp, "script-src") ?? "";
    expect(scripts).not.toContain("unsafe-inline");
    expect(scripts).not.toContain("unsafe-eval");
  });

  it("styles use the nonce, not unsafe-inline", () => {
    expect(directive(csp, "style-src")).toBe("style-src 'self' 'nonce-abc123'");
  });

  it("locks down objects, base, framing, forms and connections", () => {
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "base-uri")).toBe("base-uri 'none'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "form-action")).toBe("form-action 'self'");
    expect(directive(csp, "frame-src")).toBe("frame-src https://challenges.cloudflare.com");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'");
  });

  it("upgrades insecure requests", () => {
    expect(csp).toContain("upgrade-insecure-requests");
  });
});

describe("buildCsp (development)", () => {
  const csp = buildCsp({ nonce: "abc123", isDev: true });

  it("allows eval and inline styles for React debugging and hot reload", () => {
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "style-src")).toContain("'unsafe-inline'");
  });

  it("does not force https on localhost", () => {
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
