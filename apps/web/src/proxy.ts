import { type NextRequest, NextResponse } from "next/server";

import { buildCsp } from "@/lib/csp";

/** Sets a per-request CSP nonce. Report-only mode (CSP_REPORT_ONLY=1) is for staging. */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const name =
    process.env.CSP_REPORT_ONLY === "1"
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";
  const csp = buildCsp({ nonce, isDev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(name, csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(name, csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Skip API routes and static assets; skip prefetches so they are not given a nonce.
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
