# Flutter instead of Next.js: what it would take

Assessment written 2026-10-31, at the end of Phase 0 (step 0.9 done, Phase 1 not started). Vercel, Neon and FastAPI stay as they are.

**Decision (2026-10-31): option B long term.** The current plan continues unchanged with Next.js, made installable as a PWA (`app/manifest.ts`, PLAN.md 1.6). The Flutter app is revisited at the Phase 2 gate (PLAN.md 2.5). Until then, this document is reference only.

## Short answer

- **Rewriting the code is small.** `apps/web` is about 800 lines today: a page shell, CSP and security headers, an env check, an API client, a health route, plus tests. Phase 1 has not started, so no landing page sections or forms exist yet. If the front end changes, now is the cheapest time.
- **The architecture change is big.** Next.js runs on a server, and that server is the backend-for-frontend (ADR 0001): it holds the service token, hides the API and renders HTML for search engines. A Flutter app runs entirely on the user's device or in their browser, so that server layer disappears. That changes the API's security model, the CSP approach (ADR 0007), the SEO plan and the performance budgets.
- **Flutter is a poor fit for the public landing page.** Flutter web draws the page onto a canvas and downloads about 2 MB or more before the first paint. Phase 1 requires LCP under 2 s on mobile 4G, under 100 KB of JS, and Lighthouse SEO 100 and Accessibility 100. Flutter web cannot meet those budgets. Flutter's own guidance is to build text-heavy, search-indexed pages as HTML and use Flutter for the app.
- **Flutter is a strong fit for a real app** in the App Store and Google Play: offline devotionals, push notifications for the weekly devotional, an audio player and home-screen presence. Those features belong to Phases 2 and 3.

**Recommendation:** keep Next.js for the public website and add a Flutter app for iOS and Android as a new `apps/mobile` that uses the same FastAPI (option B below). Start it when there is app-worthy content (Phase 2). Until then, make the website more mobile-ready with the PWA work already planned. Replacing Next.js entirely (option A) is possible, but it gives up SEO, first-load speed and accessibility on the page whose job is to be found and read on a phone.

## What "more mobile ready" can mean

| Need | Next.js site (today's plan) | Flutter app |
|---|---|---|
| Reads well on any phone, fast first load | Yes: mobile-first, server-rendered | Native app yes; Flutter web is slow to start |
| Found through Google, shareable links | Yes | Native no; Flutter web weak |
| Home-screen icon | PWA (`manifest.ts`, planned in 1.6) | Yes |
| Offline devotionals at the beach | PWA service worker (planned for Phase 3) | Yes, simpler and more reliable |
| Push notifications ("this week's devotional") | Web Push: iOS only after "Add to Home Screen" | Yes (APNs and FCM) |
| In the App Store and Google Play | No | Yes |
| Audio player in the background or lock screen | Limited | Yes |

If "more mobile ready" means app-store presence, push and offline, that points to a Flutter app. If it means "works great on phones", the current plan already targets that.

## Option A: replace Next.js with Flutter (web + iOS + Android)

### 1. Architecture and ADRs
- **Supersede ADR 0001 (BFF).** No server holds secrets any more, so the browser or app calls FastAPI directly. `SERVICE_TOKEN` cannot be used: anything shipped in an app or web bundle is public.
- **Supersede ADR 0007 (nonce CSP).** A static Flutter web build cannot use per-request nonces. It needs a static CSP, which must allow `'wasm-unsafe-eval'` for the Wasm renderer.
- **New ADR:** a public API with attestation (see 2), and how the web and native clients are hosted and released.
- **Update CLAUDE.md:** sections 2 (stack), 3 (architecture), 4 (layout), 5 (design system: Flutter theme instead of Tailwind), 6.2 to 6.4 (headers, CSP, BFF), 9 (frontend conventions), 10 (testing) and 11 (CI/CD). Rewrite PLAN.md Phase 1.

### 2. FastAPI changes (stays on Vercel)
- **Public endpoints:** `/v1/subscribers`, `/v1/prayer-requests` and `/v1/contact` lose the service-token requirement. Admin endpoints (Phase 2) use user sessions or tokens instead.
- **Production Deployment Protection off** for the API, since clients call it directly. Previews can stay protected.
- **CORS:** allow only the web app's origin. Native apps do not send CORS requests.
- **Bot protection:**
  - **Web:** Turnstile still works, through JavaScript interop.
  - **Native:** Turnstile does not fit. Use platform attestation instead: Apple App Attest and Google Play Integrity, verified by FastAPI (or Firebase App Check, which adds a vendor).
  - **Both:** honeypot, time-to-submit and Redis rate limits stay.
- **Client IP:** simpler. The API reads Vercel's `x-real-ip` itself, with no forwarded header from the web server.
- **Idempotency keys** come from the client (already planned).
- **Unchanged:** everything else (models, outbox, cron, encryption, Neon, Upstash).

### 3. Hosting the Flutter web build on Vercel
- **Output:** static files from `flutter build web --wasm`, with a rewrite of all routes to `index.html`.
- **Building on Vercel:** Vercel's build image has no Flutter SDK. Choose one:
  - Install it in the build command: slow, and it needs caching.
  - Build in GitHub Actions and deploy with `vercel deploy --prebuilt`. This changes the current rule that Vercel's Git integration does the deploys, and it needs a scoped Vercel token in GitHub.
- **Security headers:** HSTS, CSP, Permissions-Policy and the others move from `next.config.ts` to `vercel.json`.
- **App links:** `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` are served from the website, so links in emails can open the app.

### 4. SEO, performance and accessibility
- **SEO:** the canvas-rendered page is hard for search engines to index, and Open Graph tags and JSON-LD need hand-written HTML in `web/index.html`. Plan items in 1.6 (sitemap, robots, OG image) become partly manual.
- **Budgets in CLAUDE.md section 5:** must be rewritten.
  - The 100 KB JS budget and Lighthouse Performance 95 cannot be met.
  - LCP under 2 s on 4G is unlikely on a first visit.
- **Accessibility:** Flutter builds a semantics tree, but WCAG 2.2 AA, axe checks and screen-reader behaviour all need more manual work and testing than semantic HTML does.
- **Fonts:** Barlow and Lora get bundled as assets. Flutter's default of fetching fonts at runtime must be turned off (privacy, and the CSP).

### 5. Email links
- **Confirm, unsubscribe and expired pages** must work with no app installed. Serve them from the Flutter web build or from small static pages. With universal and app links, they open in the app when it is installed.
- **RFC 8058 one-click unsubscribe** (a POST from the mail client to the API) is unaffected.

### 6. API types
- `packages/api-types` (TypeScript) is replaced by a Dart client generated from `openapi.json`, for example with `openapi-generator` (`dart-dio`) or `swagger_parser`.
- `make types` and `types-check` are kept, so CI still fails on stale types.

### 7. Repository and tooling
- **New app:** `apps/mobile` (or `apps/app`) with `pubspec.yaml` and `pubspec.lock` committed, `flutter_lints` or `very_good_analysis`, and `dart format`.
- **Removed:** `apps/web` and the pnpm workspace, unless option B.
- **Pre-commit:** `dart format` and `flutter analyze` hooks; gitleaks stays.
- **Dependabot:** the `pub` ecosystem.
- **Makefile:** `lint`, `typecheck` and `test` call `flutter analyze` and `flutter test`. Remove `pnpm` targets. Add `make run-web` and `make run-ios`.
- **Config:** Flutter has no runtime env vars, so settings are compile-time via `--dart-define`. Never put secrets in them; only the API URL and public keys such as the Turnstile site key.

### 8. Testing and CI
- **Unit and widget tests** (`flutter test`) replace Vitest; golden tests for visual checks.
- **End-to-end:** `integration_test` (or Patrol) on an Android emulator and iOS simulator. iOS needs macOS runners, which cost about 10 times Linux minutes on GitHub Actions. Playwright suits Flutter web poorly, because the page is a canvas.
- **CI jobs:** `flutter analyze`, `flutter test` with coverage, a web build, an Android build, and an iOS build on macOS. Remove the web and Playwright jobs, and add `pub` to the security scans (OSV-Scanner reads `pubspec.lock`).
- **Branch protection:** update the required checks.

### 9. App store release (native only)
- **Accounts:** Apple Developer Program (USD 99 per year) and Google Play Console (USD 25 once). An organisation account needs a D-U-N-S number, which can take weeks.
- **Signing and pipeline:** certificates, provisioning profiles, upload keys, and a release pipeline (fastlane or Codemagic) with secrets in GitHub Environments.
- **Store paperwork:**
  - **Listings:** screenshots and descriptions.
  - **Privacy:** Apple privacy labels and the Google Data safety form. Prayer requests are special-category data, so declare them accurately.
  - **Review:** every release goes through review (hours to days), so a broken release cannot be rolled back instantly the way Vercel can.
- **App Store guideline 4.2 (minimum functionality):** an app that is only a landing page and three forms is at real risk of rejection. Store apps make sense once devotionals, audio and offline reading exist.
- **Updates:** users run old versions for months, so the API must stay backward compatible with old app builds. This needs API versioning discipline and possibly a "please update" check.

### 10. Other changes
- **Analytics:** Vercel Web Analytics covers only the web build, and route changes in a single-page app need manual events. Native needs a privacy-friendly analytics choice; Sentry has a Flutter SDK, so error tracking stays.
- **Push notifications (Phase 2):** a device-token table, an APNs and FCM sender (from the outbox and cron), and opt-in consent.
- **Scripture:** check Crossway's ESV terms for use inside apps; the terms for apps may differ from those for websites.
- **Threat model and privacy doc (step 0.10):** must cover native clients, attestation and on-device storage, which uses `flutter_secure_storage` for any tokens.

### Rough effort for option A
Phase 1 grows by roughly a third to a half, mostly from the API security redesign, store setup and release pipeline, and the extra test and CI work. The existing Next.js code is a small loss. The bigger cost is ongoing: three platforms to test and release, plus store reviews.

## Option B (recommended): Next.js website + Flutter app, both on FastAPI

- **Phase 1 unchanged:** the Next.js landing page, forms, SEO, budgets and BFF stay as planned. Make the site more mobile-ready with `manifest.ts`, icons and theme colour in 1.6, and an install prompt.
- **Phase 2 or 3:** add `apps/mobile` (Flutter for iOS and Android) for devotionals, audio, offline reading and push. Only the app's endpoints become public with attestation (sections 2, 6, 7, 8 and 9 above apply to the app only). The website keeps the BFF.
- **Email links** open the website, or the app when it is installed (universal and app links served by Next.js).
- **Cost:** two front ends to maintain, but each does what it is good at, and nothing finished is thrown away.

## Option C: stay web-only and make the PWA stronger

Add the manifest and icons now, and the service worker for offline devotionals and Web Push in Phase 3. Lowest cost. But there is no store presence, iOS push needs "Add to Home Screen", and background audio is limited.

## Decisions for Hendrik

1. What does "more mobile ready" mean for you: an app in the stores, push notifications, offline reading, or simply excellent on mobile browsers?
2. Option A, B or C? (Recommended: B, with the Flutter app starting in Phase 2.)
3. If there will be store apps: will they be published under a personal or an organisation developer account (D-U-N-S)?
4. Is the budget fine for the developer accounts (about USD 125 in the first year) and macOS CI minutes?
