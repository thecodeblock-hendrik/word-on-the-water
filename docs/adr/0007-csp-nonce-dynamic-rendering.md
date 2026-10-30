# 0007. Nonce-based CSP with dynamic rendering

Status: accepted

## Context
`CLAUDE.md` required a strict Content-Security-Policy (no `unsafe-inline` scripts) and a statically generated landing page. The Next.js 16 docs state these conflict: a per-request nonce can only be applied at request time, so nonce-based CSP disables static generation and CDN caching of HTML, and is incompatible with Partial Prerendering.

Options considered:
- A. Nonce CSP with dynamic rendering.
- B. Static pages with a hash-based CSP via Next's experimental SRI.
- C. Static pages with `'unsafe-inline'`.

Option B was tried first. Measured result: the static page contains 8 inline scripts (React's `self.__next_f.push(...)` hydration data). SRI only adds integrity hashes to the 6 external scripts, so a policy of `script-src 'self'` made the browser block all 8 inline scripts (8 console violations) and the page could not hydrate. Hashing the inline scripts after each build would need custom tooling that changes with every page and Next upgrade.

## Decision
Option A. `src/proxy.ts` (the Next 16 name for middleware) creates a fresh nonce per request and sets the CSP on the request and response. The root layout calls `connection()` so every page renders at request time. `cacheComponents` and `partialPrefetching` are turned off because they are incompatible with nonces.

The policy follows `CLAUDE.md` section 6.2: `script-src 'self' 'nonce-…' 'strict-dynamic'` plus Cloudflare Turnstile, `style-src` with the nonce, no `unsafe-inline` or `unsafe-eval` in production, `frame-ancestors 'none'`, `base-uri 'none'`. Setting `CSP_REPORT_ONLY=1` sends `Content-Security-Policy-Report-Only` instead (used in staging before enforcing in production).

## Consequences
- HTML is not cached at the CDN, so every page view runs the server function. At this site's traffic that is acceptable; static assets (JS, CSS, fonts) are still cached.
- The LCP budget (under 2.0 s on mobile 4G) is at risk and must be re-measured in Phase 1.8 on a deployed preview. If it fails, revisit option B with build-time hashing or reduce server time.
- Verified in a real browser: zero CSP violations, all inline scripts carry the nonce, nonces differ per request. Covered by Playwright tests.
- Revisit if Next supports hash-based CSP for static pages without custom tooling.
