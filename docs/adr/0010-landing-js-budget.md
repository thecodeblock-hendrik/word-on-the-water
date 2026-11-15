# 0010. Landing page JavaScript budget: 165 KB gzipped

Status: accepted 2026-11-15. Replaces the "JS shipped on landing page < 100 KB gzipped" line in CLAUDE.md section 5.

## Context
The 100 KB budget was set before the stack was measured. On 2026-11-15 a production build was measured (Next.js 16.4.6, React 19.3.1, chat off): the landing page loads about 161 KB of JavaScript gzipped, counting every script a modern browser downloads and leaving out the `noModule` polyfill chunk (39 KB), which only legacy browsers fetch.

Where it goes:
- React DOM about 71 KB and the Next.js client runtime and router about 37 KB, with Next helpers about 8 KB: roughly 115 to 120 KB that we cannot trim.
- The Got Questions code that runs on every page, about 20 KB (a 13 KB chunk and the 7 KB launcher). The chat panel itself is a separate chunk loaded on first click.
- The rest is small chunks (Turbopack runtime and other bits, about 12 KB) and one unidentified 10 KB chunk.

React and Next alone use about 115 to 120 KB, so 100 KB cannot be met without dropping the framework, and ADR 0001 and the Next.js decision stay.

## Decision
- The budget is **165 KB gzipped** of JavaScript downloaded by the landing page in a modern browser (the `noModule` polyfills do not count). It is a ceiling, not a target.
- It is enforced by the existing Playwright check in `apps/web/tests/e2e/chat.spec.ts` (ceiling of 165 KB with the chat off and on), so any growth fails CI.
- What really governs the page is the user-facing budget, measured on a deployed preview with Lighthouse CI on a mobile profile: LCP under 2.0 s, CLS under 0.05, INP under 200 ms, and scores of 95 / 100 / 100 / 100. These do not change.
- Keep the page lean: Server Components by default, client code only for interactive islands, anything heavy behind a dynamic import.

## Consequences
- The byte budget is realistic and still catches regressions. The scores and Core Web Vitals remain the real test; if they fail on a preview, trimming JavaScript (starting with the 20 KB chat code that runs on every page, and the unidentified 10 KB chunk) is the first lever.
- Option not taken for now: trimming the chat so only the launcher button loads up front. It is a possible later saving of up to about 13 KB.
- A change to Next or React that moves the total past 165 KB needs this ADR revisited, with a new measurement.
