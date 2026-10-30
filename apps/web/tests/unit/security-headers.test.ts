import { describe, expect, it } from "vitest";

import { securityHeaders } from "@/lib/security-headers";

const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));

describe("securityHeaders", () => {
  it("enforces HTTPS for two years with preload", () => {
    expect(byKey["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains; preload");
  });

  it("blocks sniffing and limits referrers and window access", () => {
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("denies powerful browser features", () => {
    const policy = byKey["Permissions-Policy"];
    for (const feature of ["camera", "microphone", "geolocation", "payment", "usb"]) {
      expect(policy).toContain(`${feature}=()`);
    }
  });
});
