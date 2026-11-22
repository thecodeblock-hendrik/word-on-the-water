# CLAUDE.md — Word on the Water

Development plan and working rules for the **Word on the Water** web application: an online Christian ministry publishing devotionals and Bible teaching for surfers and anyone who feels the swell of life.

> *"Who then is this, that even the wind and the sea obey him?"* — Mark 4:41 (ESV)

This file is both the project plan and the instructions for anyone (human or Claude Code) working in the repository. Read it fully before making changes. When the plan and the code disagree, fix one of them in the same pull request.

**Status (updated 2026-11-21, one week before the launch on Saturday 28 November 2026):**

- **Live.** The site went live on `wordonthewater.net` on 2026-11-21 (Vercel Pro, DNS at Squarespace, mail records untouched). Production auto-promotion is **off** in both Vercel projects: a merge to `main` builds a production deployment that someone promotes by hand (see [deploy.md](docs/runbooks/deploy.md)), and crons run only on the promoted one. Crons: outbox drain every 5 minutes, Kit sync daily 03:00 UTC, retention daily 03:30 UTC.
- **Built and proven on the live domain.** Email sign-up (Turnstile, Kit double opt-in confirmed end to end, an unsubscribe followed through the sync), `/thank-you`, the privacy page, the devotional pages (five Advent devotionals; the first, More Than Watchmen, is published on 28 November and is shown before then by design), the Bible reader (BSB and WEB, `BIBLE_ENABLED`, ESV waits for Crossway), the installable PWA (no service worker), the Ask the Word chat (`CHAT_ENABLED`, walked through on production 2026-11-21) and the weekly email draft command (`pnpm broadcast:devotional`; a test broadcast reached the inbox with SPF, DKIM and DMARC passing).
- **Kit.** No webhook is registered: Kit's webhook endpoints need a paid plan, so a daily sync (`/cron/sync-kit`) keeps the `subscribers` mirror right instead; the receiver and `make kit-webhook` stay for a paid plan. Kit cannot re-subscribe an unsubscribed person through its API, so the sign-up success message tells a returning reader to email `hello@` (ADR 0008, [post_launch.md](docs/post_launch.md)). Invisible reCAPTCHA is on for Kit's own hosted form page, which skips our Turnstile; our own sign-ups do not use it.
- **Chat.** Answers come from our own knowledge base (228 entries, 41 glossary terms), no model, nothing stored on the server. After the 2026-11-21 walk-through the search folds British and American spellings, a typed glossary word gets its definition, and "Lord" and "Saviour" became glossary terms (ADR 0009, [chat runbook](docs/runbooks/chat.md)).
- **Phone bottom bar and the Ask the Word name (2026-11-22).** The chat was renamed from Got Questions to **Ask the Word**, and a raised-tab bottom bar was built for phones on the landing page, devotionals, the chat and the Bible reader (see section 5 and [landing_page_nav.md](docs/landing_page_nav.md)). Left: the real phone check with VoiceOver and TalkBack, and the idea of hiding the bar while scrolling.
- **Security and operations.** CSP enforced, `/docs` and `/openapi.json` 404 in production, the threat items re-checked, Vercel Firewall rate-limit rules on sign-up and chat (on Log first, switched to 429 after a day of traffic), two-factor on every account, DMARC `p=reject` with Kit's DKIM passing. The accepted advisories (picomatch, glob, minimatch) lapse on the dates in [post_launch.md](docs/post_launch.md). `@playwright/test` is held at 1.64.1 and Dependabot ignores 1.65.x.
- **Not part of the launch.** The prayer request form (1.4) and contact form (1.5) (decided 2026-11-14; the page shows `hello@` as a mail link), and everything in [post_launch.md](docs/post_launch.md): `migrate.yml`, a staging environment, a log drain, Web Push, the ESV, Phase 2.
- **Open before launch** (the status table at the top of [production_checklist.md](docs/production_checklist.md) has the counts): the rollback rehearsal and the backup restore test, the production database check, the uptime monitor and Sentry alert (the Part J gate), the Part I checks only Hendrik can do (phone, Sentry, the database consent version), cleaning the Kit spike leftovers, the real broadcast for devotional 1 (schedule it for 28 November after 02:00 Harare time). PLAN.md steps 1.1 to 1.11 are done (the manual passes and the Android check included); the one leftover there, making Lighthouse a required check, is in post_launch.md. The Kit sign-up failure alert and the Organization `logo` are small items Claude can do on request.
- **Where to look.** Progress step by step in [PLAN.md](docs/PLAN.md); launch work in [production_checklist.md](docs/production_checklist.md); everything decided for after launch in [post_launch.md](docs/post_launch.md); this file holds the stack, rules and decisions.

---

## 1. Goals and scope

**Goal:** a production-ready, mobile-first, secure web application whose full framework (frontend, API, database, auth scaffolding, CI/CD, observability) is in place from day one, while **Phase 1 ships only the public landing page**.

**Phase 1 user-facing features (from the mockup):**

1. Landing page sections: hero (Mark 4:41 + logo), About / who it's for, What's coming (weekly devotional, teaching series, audio) with a sample "surf report" devotional, Start here (the gospel in 4 steps), statement of faith, founder bio, footer with ESV copyright notice.
2. **Email sign-up** (first name optional, email required) with double opt-in.
3. **Prayer request / contact form** (**deferred past the launch, decided 2026-11-14**; the prayer option is removed from the page until then (no menu or footer link, no `prayer@` address shown), and `hello@` stays the contact address) (the mockup shows `mailto:` links; we replace them with a private, spam-protected form that stores the request and notifies the prayer inbox (`prayer@wordonthewater.net`)).
4. **Ask the Word chat** (built behind `CHAT_ENABLED`, step 1.10): "Ask the Word" is a button in the Start here section and a link in the menu bar and mobile menu (while the chat is off, "Talk to someone" is a mail link to `hello@`); it opens a chat (drawer on desktop, full-height sheet on phones). A visitor who taps a key verse in an answer gets a "Your chat" way back in the Bible reader (a round button in the middle of the pinned chapter bar on phones, inside a raised part whose top line curves around it (mockup New A), and a mid-height edge tab from `lg`) that opens the chat in place. Questions about the Christian faith are answered from our own reviewed knowledge base (228 entries, JSON generated from markdown), with follow-ups. No LLM, no web search, nothing stored on the server. Plan: [chat.md](docs/archive/chat.md), build checklist: [chat_checks.md](docs/archive/chat_checks.md); decision: ADR 0009.

**Out of scope for Phase 1** but designed for: devotional library, teaching series, audio/podcast, public user accounts, admin CMS, search, newsletter sending.

**Mobile strategy (decided, option B in [FLUTTER.md](docs/FLUTTER.md)):** the Next.js site is the mobile experience: mobile-first, fast, and installable as a PWA through `app/manifest.ts`. A native Flutter app for iOS and Android may be added later on the same FastAPI; it is revisited at the Phase 2 gate. Until then, no Flutter work and no changes to the web stack.

**Design source:** `docs/design/landing-page-design-document.pdf` (the specification) and `docs/design/wotw_landing_page.html` (the approved mockup); the older `website/landing-page-mockup.html` is superseded. Where the mockup and the document disagree, the document wins. The mockup is the visual reference, not production code. Its "design notes" and "Ideas for Hendrik" sections are not shipped.

**Repository:** public at https://github.com/thecodeblock-hendrik/word-on-the-water, no license (all rights reserved). Because it is public: never commit secrets, real prayer requests or subscriber data; gitleaks runs in pre-commit and CI.

---

## 2. Stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 16 (App Router) + React + TypeScript (strict)** | Server rendering for SEO and fast first paint on mobile (per request because of the nonce CSP, ADR 0007), Server Components, Server Actions |
| Styling | **Tailwind CSS v4** driven by CSS custom-property design tokens | Tokens map 1:1 to the mockup's `--bg`, `--ink`, `--accent` etc.; mobile-first utilities |
| UI primitives | Radix UI / shadcn-style components (copied in, not a dependency black box) | Accessible by default |
| Forms & validation | `react-hook-form` + **Zod** (web), **Pydantic v2** (API) | Validate on both sides; API is the source of truth |
| Backend | **FastAPI** on **Python 3.13**, run with Uvicorn (Gunicorn workers in prod) | Typed, fast, OpenAPI out of the box |
| ORM / migrations | **SQLAlchemy 2.x (async) + Alembic** | Mature, explicit, migration-first |
| Database | **PostgreSQL 18** | Reliable, `citext`, `pgcrypto`, full-text search for later phases |
| Cache / rate limits | **Valkey/Redis** (managed, e.g. Upstash) | Rate limiting, idempotency keys, later sessions/queues |
| Background jobs | **Outbox table drained by Vercel Cron** (plus an immediate best-effort send after the request). Phase 2+: Vercel Queues or QStash if volume needs it | Vercel has no long-running workers; email sending must not block requests and must be retryable |
| Subscriptions and newsletter | **Kit** (kit.com, API v4, API key auth) | Owns the subscriber list, double opt-in confirmation email, unsubscribe links, legal footer and broadcasts (ADR 0008). Our API forwards sign-ups and mirrors the Kit list (webhooks on a paid plan, a daily sync at launch) |
| Transactional email | **Postmark** (assumed, swappable via an `EmailProvider` interface) | Kit has no transactional send API, so prayer and contact notifications still need this |
| Bot protection | **Cloudflare Turnstile** + honeypot field + rate limits | Privacy-friendly, no Google reCAPTCHA |
| Package managers | **pnpm** (web), **uv** (api) | Fast, lockfiles, reproducible |
| Local dev | Docker Compose for Postgres, Redis and Mailpit; web and API run natively (`pnpm dev`, `uvicorn`) | Mirrors Vercel's runtime, which deploys source, not containers |
| CI/CD | **GitHub Actions** | Lint, type-check, test, scan, build, deploy |
| Analytics | **Vercel Web Analytics** (or Plausible) | Cookieless, no consent banner needed, respects privacy |
| Errors / tracing | **Sentry** (web + API) with PII scrubbing; OpenTelemetry-ready structured logs | |

### Hosting: Vercel (decided)

Everything runs on **Vercel**, with data services from the Vercel Marketplace so billing, env vars and preview branches are managed in one place.

| Component | Vercel setup |
|---|---|
| Web (Next.js) | Vercel project `wotw-web` (root `apps/web`), Fluid compute, Node runtime |
| API (FastAPI) | Separate Vercel project `wotw-api` (root `apps/api`) using Vercel's native Python/FastAPI runtime (ASGI app exported from `app/main.py`). Same region as the database |
| Postgres | **Neon via Vercel Marketplace** (pooled connection string, PITR backups, a database branch per preview deployment) |
| Redis | **Upstash Redis via Vercel Marketplace** (HTTP/TLS, serverless-friendly) |
| Scheduled jobs | **Vercel Cron** (`vercel.json` in `apps/api`) calling protected endpoints: drain email outbox (every 5 minutes: the team has been on Pro since 2026-11-21, and Hobby only allows daily crons), sync subscriber status from Kit (daily 03:00 UTC), retention cleanup (daily 03:30 UTC, after the sync). The immediate best-effort send after each request still delivers email promptly |
| WAF / DDoS / rate rules | **Vercel Firewall** (managed rules, custom rate-limit rules on form routes, Attack Challenge Mode for emergencies) |
| Bot protection | Turnstile on forms (optionally plus Vercel BotID) |
| DNS | Production domain **`wordonthewater.net`** (registered; `www` redirects to the apex), with DNS hosted at **Squarespace** (Squarespace DNS records pointing the site at Vercel; nameservers are not moved to Vercel). Keep the existing MX records for the `hello@` and `prayer@` mailboxes untouched. Do not put the Cloudflare proxy in front of Vercel; it breaks caching and the firewall's view of client IPs |
| Analytics | Vercel Web Analytics + Speed Insights (cookieless, real-user Core Web Vitals) or Plausible |
| Media (Phase 3 audio) | Vercel Blob (or Cloudflare R2 if bandwidth cost matters) |
| Plan | Start on **Hobby** for Phase 0; moved to **Pro** (~USD 20/month per seat) on 2026-11-21, before public launch, since Hobby is for non-commercial use and Pro adds deployment protection options, more cron frequency and firewall rules |

**Serverless rules that follow from Vercel:**
- No long-running processes or in-memory state; anything stateful lives in Postgres or Redis.
- SQLAlchemy uses Neon's **pooled** endpoint with `NullPool` (let PgBouncer pool) and short timeouts; Alembic migrations use the **direct** (unpooled) URL.
- Keep API function cold starts small: lean dependencies, lazy-import heavy libraries, set `maxDuration` sensibly (10–30 s). Fluid compute is on for both projects (checked 2026-11-17, region `fra1`); on Hobby a function scaled to zero when idle, so the first request after a pause took about 2 s. On Pro (2026-11-21) cold-start prevention is built into Fluid Compute and enabled on both projects (no separate toggle): the first request after 15 minutes idle took 0.95 s for the web page against 0.28 s warm, and the API stays warm through the 5-minute outbox cron (production_checklist.md, Part B).
- Node: `apps/web/package.json` has `engines.node` 24.x, which overrides the Vercel dashboard's 26.x (the dashboard shows "Project Setting overridden by package.json"). That is intended: production, CI and local all run Node 24.
- Region: pin both projects and the database to the same region nearest the audience (e.g. `fra1`/`lhr1` for Europe/Africa, `iad1` for US). Confirm with Hendrik.
- Cron endpoints check the `Authorization: Bearer $CRON_SECRET` header Vercel sends.

Estimated Phase 1 running cost: USD 0 on Hobby during build; roughly USD 20–40/month on Pro at launch (Neon and Upstash free tiers cover Phase 1 traffic).

---

## 3. Architecture

```
Browser (mobile first)
   │  HTTPS only (HSTS), Vercel Edge Network + Vercel Firewall
   ▼
Next.js on Vercel (apps/web)  ── Server Components render pages (per request, nonce CSP; ADR 0007)
   │  Server Actions / Route Handlers  (the only thing the browser talks to)
   │  server-to-server, HTTPS, service token + forwarded client IP
   ▼
FastAPI on Vercel Functions (apps/api)  ── validation, business rules, auth, rate limits
   │                 ├── Upstash Redis  (rate limits, idempotency)
   │                 ├── Email provider (via outbox, drained by Vercel Cron)
   │                 ├── Kit API (sign-ups via outbox job; Kit webhooks reach the API through /api/webhooks/kit on the web project)
   ▼
Neon PostgreSQL  ── least-privilege role, TLS, encrypted at rest, PITR backups
```

**Key decision — backend-for-frontend (BFF):** the browser never calls FastAPI directly. Next.js Server Actions call the API server-side with a service credential. This removes CORS from the public surface, keeps the API URL and tokens out of the browser, and gives one place for session cookies later. FastAPI still validates everything as if it were public (defence in depth) and rejects any call without the service token. In production the API project's public `*.vercel.app` URL is covered by Vercel Deployment Protection, and only the web project (via a protection-bypass secret) and Vercel Cron can reach it.

Public read-only content endpoints (devotionals, series) may later be exposed directly with caching if needed; that is a deliberate future decision, not a default.

---

## 4. Repository layout (monorepo)

```
word-on-the-water/                (items marked "planned" do not exist yet)
├── CLAUDE.md, README.md, SECURITY.md
├── docker-compose.yml            ← local Postgres 18, Valkey, Mailpit
├── docker/postgres/init.sql      ← extensions and local roles (app_migrator, app_runtime)
├── Makefile, pnpm-workspace.yaml, .pre-commit-config.yaml, .env.example
├── scripts/setup_env.py          ← `make setup` writes .env with random local secrets
├── db/ (neon_roles.sql, neon_backup_role.sql)   ← one-off least-privilege roles on Neon (see docs/runbooks/deploy.md)
├── website/landing-page-mockup.html   ← older design reference (superseded by docs/design)
├── .github/
│   ├── workflows/ (ci.yml, security.yml, codeql.yml, neon-preview-cleanup.yml, backup.yml; migrate.yml planned, after launch, see docs/post_launch.md)
│   ├── dependabot.yml
│   └── pull_request_template.md
├── docs/
│   ├── PLAN.md, production_checklist.md, FLUTTER.md   ← the two lists to follow (everything outstanding that is not about launch is in PLAN.md; launch-day steps, including the domain and Kit webhook guide, are in production_checklist.md), native app assessment
│   ├── archive/                  ← finished and retired documents: chat.md (scope) and chat_checks.md, landing_page_check.md, kit_setup.md (email DNS), kit_webhook_checks.md, secret_key_instructions.md, threat_plan.md, next-step notes, old checklists
│   ├── kit_email_devotional.md   ← the weekly Kit email end to end: command, test tag, images, errors
│   ├── bible_feature.md, PWA_checklist.md, web_push.md, devotional_format.md   ← Bible reader plan, PWA steps, Web Push plan (decided 2026-11-16, planned after the PWA), devotional file format
│   ├── design/                   ← landing page document and mockup, bible_mockups.html (reader, picker options), chat_mockups.html (Ask the Word chat)
│   ├── adr/                      ← 0001 to 0011
│   ├── runbooks/                 ← deploy.md, incident.md, restore-db.md, rotate-secrets.md, chat.md
│   └── threat-model.md, privacy.md
├── apps/
│   ├── web/                      ← Next.js 16
│   │   ├── AGENTS.md             ← generated by Next: read node_modules/next/dist/docs first
│   │   ├── src/proxy.ts          ← per-request CSP nonce (Next 16 name for middleware)
│   │   ├── src/app/ (layout.tsx, page.tsx, not-found.tsx, error.tsx, api/health/route.ts, api/webhooks/kit/route.ts (forwards Kit webhooks to the API),
│   │   │   thank-you/page.tsx (where Kit sends a subscriber after confirming), devotionals/[slug]/page.tsx, content/[kind]/[slug]/[version]/[file]/route.ts for content images (the version is a content hash that busts caches),
│   │   │   bible/page.tsx and bible/[version]/[book]/[chapter]/page.tsx, behind BIBLE_ENABLED,
│   │   │   privacy/page.tsx (the public privacy policy), robots.ts, sitemap.ts, opengraph-image.tsx, .well-known/security.txt/route.ts)
│   │   │   └── planned: prayer and contact forms,
│   │   │       (admin)/ for Phase 2
│   │   ├── src/app/ also holds manifest.ts, icon.svg (the master icon) and apple-icon.png; public/icons and public/screenshots hold the PNGs they list, and public/email holds the weekly email banners (never rename or replace one an email has used)
│   │   ├── src/content/landing.ts ← all landing page copy as typed data
│   │   ├── src/content/chat.ts, bottom-nav.ts ← the chat wording and the phone bottom bar labels
│   │   ├── src/content/privacy.ts ← the public privacy policy as typed data; written from docs/privacy.md, keep the two in step; the launch check scans it
│   │   ├── src/components/ (layout/, sections/, devotional/, bible/, signup/, ui/, chat/, content-image.tsx, theme-toggle.tsx)
│   │   │   └── bible/: reader, passage-popover (lg and up), passage-sheet (below lg), picker-parts, use-passage-picker, chapter-nav, version-switcher
│   │   │   └── layout/: header, mobile-menu, footer, bottom-nav (the phone bar), bottom-nav-host (leaves it off the Bible reader), bottom-nav-icons, raised-bump (the curve behind the round button); bible/shore-button; chat/: undo-toast, use-keyboard-open; lib/chat/: cleared (the chat just cleared, kept in memory for Undo), screen (phone or drawer)
│   │   ├── src/lib/ (api-client.ts, env.ts, csp.ts, security-headers.ts, scripture.ts, theme.ts, sentry.ts,
│   │   │   signup.ts, signup-state.ts, signup-draw.ts (the sign-up form logic), kit-webhook.ts (the webhook forwarder),
│   │   │   actions/ (subscribe, theme), devotionals/: loader, schema, series, email, kit-broadcast; bible/: books, picker, passage source, USFM import)
│   │   ├── content/ (devotionals/, series/, bibles/) ← devotionals as markdown with front matter, see docs/devotional_format.md; bibles/ is generated BSB and WEB chapter JSON (about 15 MB, `pnpm build:bible`)
│   │   ├── content/site/founder/henno-surfing.jpg ← writer photo, served through the hashed content route
│   │   ├── scripts/ (check-placeholders.mts, check-devotionals.mts, build-bible.mts, broadcast-devotional.mts, make-icons.mts, make-screenshots.mts) ← launch gates, the Bible importer, the Kit draft command and the icon and screenshot makers, run with pnpm
│   │   ├── src/styles/tokens.css ← design tokens from the mockup
│   │   ├── tests/ (unit/, e2e/), vitest.config.ts, playwright.config.ts
│   │   └── vercel.json           ← region, ignored builds
│   └── api/                      ← FastAPI
│       ├── pyproject.toml, uv.lock, alembic/ (env.py, versions/)
│       ├── app/
│       │   ├── main.py, openapi_export.py
│       │   ├── core/ (config, errors, logging, middleware, observability, rate_limit, security; crypto planned)
│       │   ├── db/ (base, ids, session)
│       │   ├── models/ (subscriber, prayer_request, contact_message, email_outbox, audit_log)
│       │   ├── routers/ (health, cron, v1 (subscribers), chat, webhooks (Kit); planned: prayer, contact, admin/)
│       │   ├── services/ (subscribers, kit_jobs, kit_events, bot_checks, idempotency, outbox, email_templates, kb, kb_search, chat_guards, chat, with the generated `app/data/faith_kb.json` and its markdown source in `kb/`)
│       │   ├── integrations/email/ (base, console, smtp, postmark, factory); integrations/turnstile.py
│       │   ├── integrations/kit/ (client, factory, webhook signature check, webhook_endpoint registration tool)
│       │   ├── jobs/ (drain_outbox, retention, sync_kit)
│       │   └── schemas/ (subscribers, kit_webhook; prayer and contact come with their steps)
│       ├── tests/ (unit tests at the top level; integration/ against real Postgres, Valkey, Mailpit)
│       └── vercel.json           ← region, maxDuration, ignored builds, cron
└── packages/
    └── api-types/                ← openapi.json and src/schema.d.ts, generated by `make types`
```

Layering rule for the API: `routers → services → models/db`. Routers handle HTTP only; services hold logic and are unit-testable without HTTP; integrations are behind interfaces so they can be faked in tests.

---

## 5. Mobile-first design system

- **Write base styles for ~360px wide screens first**, then add `sm`/`md`/`lg` enhancements. Never design desktop and shrink.
- Breakpoints (Tailwind): `sm 640`, `md 768`, `lg 1024`, `xl 1280`. The mockup's ad-hoc 420/520/760/800/860/900 breakpoints are consolidated onto these.
- **Design tokens** (`tokens.css`) carry the mockup's variables: `--bg --surface --ink --muted --line --accent --accent-ink --deep --on-deep --on-deep-muted --accent-on-deep`. Two schemes, Dawn patrol (light) and Night swell (dark), per `docs/design`; dark mode via `prefers-color-scheme` plus a user toggle stored in a cookie (so SSR renders the right theme with no flash). Only tokens change if the colours are revised.
- **Fonts:** Barlow Condensed (display), Barlow (UI), Lora (devotional body). Self-host via `next/font` (no Google Fonts request, better privacy and performance), `display: swap`, subset to Latin.
- Readable measure `62ch` for devotional text; base font size ≥ 16px (prevents iOS zoom on inputs); line-height 1.5–1.7.
- **Touch targets ≥ 44×44px**, spacing ≥ 8px between targets. Mobile navigation: sticky header with a single primary CTA ("Get the devotional") and an accessible menu (Radix Dialog/Sheet) replacing the hidden desktop nav. The theme toggle sits at the top right of the header from `lg` and as a Theme row at the foot of the menu below `lg`.
- Respect `prefers-reduced-motion`; respect safe-area insets (`env(safe-area-inset-*)`) for notched phones.
- Images: `next/image`, AVIF/WebP, explicit sizes, lazy below the fold. Logo as inline SVG using `--logo-ring`/`--logo-wave` tokens as in the mockup.
- Forms on mobile: correct `type`/`inputmode`/`autocomplete` (`email`, `given-name`), visible labels (not placeholder-only — fix from mockup), inline errors announced via `aria-live`.
- **Phone bottom bar (built 2026-11-22, plan and steps in [landing_page_nav.md](docs/landing_page_nav.md), mockups in `docs/design/landing_nav.html`):** below `lg`, with the Bible reader and the chat both on, a raised-tab bar sits at the bottom of every page except the Bible reader: Devotional (the latest published devotional, current page marked), Bible in a round 56px button in the middle (a bump in the top line), and Ask the Word, which opens the chat in place. Inside the chat the bar is Devotional, Bible and Shore (back to the landing page), under a floating message pill, and it hides while the keyboard is open. In the Bible reader the pinned chapter bar keeps Previous and Next with Shore in the middle, or Your chat for a visitor who came from the chat. Leaving the chat on a phone clears the thread, the draft and the way back, and an 8 second "Chat cleared, Undo" toast brings it back (kept in memory only; a verse link never clears). The chat does not focus its message box on a phone, so the keyboard stays shut until the visitor taps it. Desktop is unchanged. Open idea: hide the bar while scrolling down on reading pages (mockups in section H).
- **Installable PWA (Phase 1):** the site must feel like an app on a phone. Read `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` and `.../03-file-conventions/01-metadata/manifest.md` first. The step-by-step build is in [PWA_checklist.md](docs/PWA_checklist.md).
  - `app/manifest.ts` returning `MetadataRoute.Manifest`: `name`, `short_name` ("WotW"), `description`, `id`, `start_url` and `scope` `/`, `display: "standalone"` (no `orientation` lock, which fails WCAG 1.3.4), `lang`, `categories`, `background_color` and `theme_color` (both Night swell navy from `THEME_COLORS`), `shortcuts` (Start here, and Bible while `BIBLE_ENABLED` is on) and narrow `screenshots` (the landing page, a devotional and the Bible reader while it is on), made by `pnpm make:screenshots`.
  - Icons: 192 and 512 px PNG, a 96 px icon for the shortcut, a 512 px maskable icon (logo inside the safe zone), `app/icon.svg`, and `app/apple-icon.png` (180 px) for iOS, all rendered from the one master `src/app/icon.svg` by `pnpm make:icons` (rerun it and commit the PNGs when the logo changes).
  - `export const viewport` with `themeColor` per colour scheme (light and dark media queries) and `viewport-fit=cover`; `metadata.appleWebApp` for the iOS home-screen launch.
  - The manifest and the icons cannot follow the light and dark theme, so there is one navy pair for both; the browser bar colour on the page itself still follows the scheme through `viewport.themeColor`.
  - Offline reading (service worker) is Phase 3 and Web Push is planned after the PWA ([web_push.md](docs/web_push.md)); they share one service worker, so they are decided together. Neither is Phase 1.

### Performance budgets (enforced in CI with Lighthouse CI on a mobile profile)

| Metric | Budget |
|---|---|
| LCP (mobile, 4G) | < 2.0 s |
| CLS | < 0.05 |
| INP | < 200 ms |
| JS shipped on landing page | < 165 KB gzipped (ADR 0010; React and Next alone are about 120 KB) |
| Lighthouse Performance / Accessibility / Best Practices / SEO | ≥ 95 / 100 / 100 / 100 |

### Accessibility

Target **WCAG 2.2 AA**. Semantic landmarks and headings (as in the mockup), skip link, focus-visible styles, colour contrast checked for every scheme, `axe` checks in Playwright on every page, keyboard-only and screen-reader (VoiceOver iOS, TalkBack) manual pass before each release.

---

## 6. Security (designed in from day one)

Baseline: **OWASP ASVS 4.0 Level 2** for anything handling personal data, OWASP Top 10 as the review checklist. Maintain `docs/threat-model.md` (STRIDE) and update it when a feature adds data or an entry point.

### 6.1 Data we hold and why it matters

| Data | Sensitivity | Handling |
|---|---|---|
| Subscriber email + first name | Personal data | Held by Kit (processor) with a minimal mirror in our database; double opt-in and unsubscribe handled by Kit; deletable on request in both places |
| Prayer requests | **Special-category / highly sensitive** (religious belief, health, family situations) | Field-level encryption, strict access, short retention, never in logs/analytics/Sentry |
| Contact messages | Personal data | Stored, retention-limited |
| Chat questions (Ask the Word, behind `CHAT_ENABLED`) | Can reveal religious belief (special category) | Answered in memory from the local knowledge base; never stored or logged on the server and never sent to a third party; personal details are rejected before use; the thread lives only in the visitor's tab (`sessionStorage`) |
| IP address | Personal data | Used transiently for rate limiting; store only a salted hash, if at all |

Comply with **GDPR and POPIA** (and similar) by default: data minimisation, clear privacy notice, consent recorded with timestamp and source, right to access/delete, documented retention.

### 6.2 Transport and headers

- HTTPS everywhere; **HSTS** `max-age=63072000; includeSubDomains; preload`; TLS 1.2+.
- **Content-Security-Policy** with per-request nonces set in `proxy.ts` (nonce vs hash-based approach pending, see PLAN.md 0.6): `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self'; img-src 'self' data:; style-src 'self' 'nonce-…'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests`. Start in report-only in staging (`CSP_REPORT_ONLY=1`), enforce in production. The nonce is created in `src/proxy.ts` (ADR 0007); the other static headers are in `next.config.ts`. `upgrade-insecure-requests` is sent only on https requests, because WebKit rewrites `http://localhost` assets to https and breaks the page in local and CI runs.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deny camera, mic, geolocation, etc.), `Cross-Origin-Opener-Policy: same-origin`. Remove `X-Powered-By`.
- API responses: `Cache-Control: no-store` on anything personal; JSON only; strict `Content-Type` checks.

### 6.3 Input handling and abuse prevention

- Validate with Zod on the web **and** Pydantic on the API (API wins). Strict length limits (e.g. name ≤ 80, email ≤ 254, prayer text ≤ 2,000 chars), reject unknown fields (`extra="forbid"`).
- Never render user content as HTML. If rich text arrives later, sanitise server-side with an allow-list.
- **Bot protection:** Turnstile token verified server-side by the API; hidden honeypot field; minimum time-to-submit check.
- **Rate limiting** (Redis, sliding window) per hashed IP (IPv6 per /64, IPv4-mapped as IPv4) and per email: e.g. sign-up 5/hour/IP, prayer 3/hour/IP; plus Vercel Firewall rate-limit rules on the form routes. Take the client IP from the BFF's `X-Client-IP` only after the service token check (Vercel's `x-real-ip` is the web function behind the BFF), otherwise from `x-real-ip` / `x-vercel-forwarded-for`, never from an unauthenticated client-supplied header. Return generic `429`.
- **No account/email enumeration:** sign-up always returns the same "check your inbox" response whether the email is new, pending, or already confirmed, and whether or not the Kit call succeeded (it is retried from the outbox).
- **Kit webhooks are untrusted until verified:** check `X-Kit-Signature` (`t=<unix>,v1=<hex>`, HMAC-SHA256 over `{t}.{raw body}` with the endpoint secret, constant-time compare, 5 minute tolerance, accept any matching `v1` during rotation) against the raw body, and dedupe on event id.
- Idempotency keys on form submissions to stop double-posts on flaky mobile connections.
- SQL only through SQLAlchemy bound parameters; no string-built SQL.
- Request body size limit at the proxy and in the app.

### 6.4 Server Actions / BFF

- Server Actions validate input, check origin (Next.js built-in), then call the API with `Authorization: Bearer <SERVICE_TOKEN>` and `X-Client-IP` of the real client (Vercel overwrites `X-Forwarded-For` between the two projects; the API trusts `X-Client-IP` only after the token check).
- The API rejects requests without a valid service token on non-health routes. Tokens are rotated via the runbook.
- `server-only` package imported in every module that touches secrets so they can never be bundled to the client. Only `NEXT_PUBLIC_*` variables reach the browser, and those contain nothing secret.

### 6.5 Authentication and authorisation (scaffolded now, used in Phase 2)

- Phase 1 has **no public login**. Prayer requests are emailed to the prayer inbox, `prayer@wordonthewater.net` (content minimised, see 6.6) and stored encrypted.
- Phase 2 admin: email magic-link or passkey (WebAuthn) login, with mandatory TOTP/passkey second factor for admins. Sessions are opaque random IDs in Postgres/Redis, sent as `__Host-` cookies: `HttpOnly; Secure; SameSite=Lax; Path=/`. Short idle timeout (30 min) for admin. No JWTs in localStorage.
- **RBAC** from the start in the schema: roles `admin`, `editor`, `prayer_team`. Every admin endpoint declares its required permission via a FastAPI dependency; default deny. Audit log table records who viewed/changed what (especially prayer requests).
- If public accounts are ever added: Argon2id password hashing (or passkeys only), breached-password check, lockout/backoff, email verification.

### 6.6 Encryption and secrets

- Database encrypted at rest (provider) and connections over TLS (`sslmode=verify-full`).
- **Prayer request bodies encrypted at the application layer** (AES-256-GCM via `cryptography`, envelope encryption, key in the secret manager; key ID stored per row to allow rotation).
- Prayer notification emails contain only first name and the request text if the requester ticked "OK to email the prayer team"; otherwise just "a new request is waiting" (Phase 2 admin view). Decide default with Hendrik.
- Secrets live in **Vercel Environment Variables** marked *Sensitive*, scoped separately for Development, Preview and Production (preview never gets production keys: previews use their own Neon base branch, roles and passwords, and their own Upstash database), plus GitHub Environments for CI-only secrets. Local runs use the root `.env` from `make setup`. Never in the repo or in client bundles. `.env.example` lists names only. **gitleaks** in pre-commit and CI.
- `KIT_API_KEY` and `KIT_WEBHOOK_SECRET` are Sensitive Vercel variables on the API project only, with the Production key never in Preview or Development (use a separate Kit test form or account there). Kit allows 120 requests per minute per API key.
- Separate DB roles: `app_migrator` (DDL, used only by migrations) and `app_runtime` (DML on app tables only).

### 6.7 Supply chain and code security

- Lockfiles committed; `pnpm install --frozen-lockfile`, `uv sync --locked`.
- Dependabot (weekly, grouped), `pnpm audit` and `pip-audit` in CI, **CodeQL** for TS and Python, **Bandit** + **Ruff** security rules, **OSV-Scanner** across both lockfiles.
- Pin GitHub Actions to commit SHAs; least-privilege `permissions:` in workflows. Use a scoped Vercel token stored as a GitHub Environment secret only where CI must call Vercel; prefer Vercel OIDC federation for any cloud access from functions.
- Vercel: enable Deployment Protection on preview deployments, restrict who can promote to production, turn on 2FA for every team member, use the Vercel Activity Log (the audit log is Enterprise-only; on Pro the free Activity Log is always on).
- Branch protection on `main`: PR required, checks green, 1 review, no force-push, signed commits recommended.
- Keep production dependencies separate from dev dependencies (`uv` groups, `devDependencies`) so test tooling never ships in a function bundle.

### 6.8 Logging, monitoring, incident response

- Structured JSON logs (`structlog` in API) with request IDs; **never log request bodies, emails, or prayer text**. Sentry `before_send` scrubs PII; `sendDefaultPii: false`.
- Alerts: error-rate spike, 5xx, failed email sends, DB connection failures, certificate expiry, uptime check (e.g. Better Stack/UptimeRobot on `/api/health`), Vercel Log Drains to a log store (e.g. Better Stack or Axiom) since Vercel's built-in log retention is short.
- `SECURITY.md` with a contact address (`hello@wordonthewater.net` until a dedicated `security@` alias exists); `/.well-known/security.txt` with the same `Contact:` and a `Canonical:` of `https://wordonthewater.net/.well-known/security.txt`.
- `docs/runbooks/incident.md`: contain, assess, notify (data-breach notification duties under GDPR/POPIA), fix, review.

### 6.9 Backups and data retention

- Neon point-in-time recovery (≥ 7 days on the paid plan) plus a nightly `pg_dump` (`backup.yml`, read-only role `app_backup`) encrypted with age and stored in a private Cloudflare R2 bucket in Western Europe for 30 days; **restore tested quarterly** (`docs/runbooks/restore-db.md`).
- Retention: unconfirmed subscribers deleted after 7 days; prayer requests after 90 days; contact messages after 12 months; audit logs 1 year; sent outbox rows after 7 days and failed ones after 30 (they hold the recipient's address). Enforced by `/cron/retention` (a daily Vercel Cron job, 03:30 UTC) in our database only: Kit's API cannot delete a subscriber, so unconfirmed Kit subscribers are deleted by hand in the Kit dashboard (monthly).

---

## 7. Data model (Phase 1, with room to grow)

All tables: `id UUID` (v7 preferred), `created_at`, `updated_at` (timestamptz, UTC). Use `citext` for emails.

```
subscribers                     -- mirror of Kit; Kit is the source of truth for the list
  id, email citext unique, first_name varchar(80) null,
  status enum(pending, active, unsubscribed, bounced),
  kit_subscriber_id bigint null,   -- added in 1.3
  consent_text_version, consent_at, confirmed_at, unsubscribed_at,
  source varchar(40)            -- e.g. "landing_hero", "landing_footer"
  -- status is updated from Kit: by webhooks (activated, unsubscribed, bounced, complained) on a paid plan, by the daily sync at launch
  -- the confirm and unsubscribe token columns are dropped in 1.3: Kit issues those tokens

prayer_requests
  id, first_name varchar(80) null, email citext null (for a reply, optional),
  body_ciphertext bytea, key_id varchar(40),
  share_with_team boolean, wants_reply boolean,
  status enum(new, prayed_for, replied, archived),
  delete_after timestamptz

contact_messages
  id, name, email, subject, body, status, delete_after

email_outbox                    -- transactional outbox pattern
  id, template, to_address, payload jsonb, status enum(pending, sent, failed),
  attempts, last_error, next_attempt_at

audit_log
  id, actor_id null, action, entity_type, entity_id, ip_hash, metadata jsonb

-- Phase 2 (create via migrations when the phase starts, not now)
users, roles, user_roles, sessions, devotionals, series, scriptures, tags, media_assets
```

Subscriber confirm and unsubscribe tokens and links are issued and expired by Kit; we store none. The `email_outbox` also carries retryable `kit_subscribe` jobs.

---

## 8. API design (FastAPI)

- Versioned under `/v1`. JSON only. Consistent error shape: `{ "error": { "code": "rate_limited", "message": "…" } }`. No stack traces in responses.
- OpenAPI schema generated in CI → TypeScript types in `packages/api-types` (via `openapi-typescript`) so the web client is type-safe. Disable `/docs` and `/openapi.json` in production (or protect them).

Phase 1 endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health/live`, `/health/ready` | Liveness; readiness checks DB + Redis |
| POST | `/v1/subscribers` | Validate, then create the subscriber in Kit and add it to the double opt-in form via the outbox (always 202, same body). Kit sends the confirmation email |
| POST | `/v1/webhooks/kit` | Kit webhook receiver (built, not registered at launch): signature verified, updates subscriber status (no service token; the signature is the auth). Kit cannot pass the API project's login wall, so it calls `POST /api/webhooks/kit` on the web project, which forwards the raw body and signature and adds the bypass secret server-side |
| POST | `/v1/prayer-requests` | Submit a prayer request (202) |
| POST | `/v1/contact` | Submit a general message (202) |
| POST | `/v1/chat/messages` | Ask the Word (built, behind `CHAT_ENABLED`, step 1.10): answer a question or follow-up from the local knowledge base. Stateless (the body carries `last_entry_id` and `seen_entry_ids`), rate limited, replies are `answer`, `clarify`, `no_answer`, `crisis`, `smalltalk` or `rejected`. Plan in [chat.md](docs/archive/chat.md) |

Settings via `pydantic-settings`, failing fast at startup if required secrets are missing. Blank environment values count as unset.

**Implemented so far:** `GET /health/live`, `GET /health/ready` (database and Redis), `GET /v1/ping` (service token required; stands in for the default-deny `/v1` router) and `GET /cron/drain-outbox`, `GET /cron/sync-kit` and `GET /cron/retention` (`CRON_SECRET`). Of the Phase 1 endpoints in the table above, `POST /v1/subscribers` exists (step 1.3: rate limits it (5 an hour per address, 3 per email), honours an `Idempotency-Key`, checks the honeypot, the minimum time and Turnstile, stores the pending subscriber and queues the Kit call, which is tried right after the response and retried by the cron; `POST /v1/chat/messages` answers the chat from the local knowledge base (service token, 30 messages per 10 minutes per address, honeypot and minimum time, 503 when `CHAT_ENABLED` is unset, no message text in logs or Sentry); `POST /v1/webhooks/kit` verifies Kit's signature and mirrors subscriber status (the forwarder `/api/webhooks/kit` on the web project is built too; registering the webhook in Kit needs the live domain, see `docs/production_checklist.md`). The sign-up form has been proven end to end on a Vercel preview (2026-11-08). The web sign-up form (a `useActionState` form with a Server Action in the `SubscribeBand`, `#subscribe`, on the landing page and every devotional) and `/thank-you` are built; Turnstile loads only when the form is near the screen or used); the prayer and contact endpoints arrive in steps 1.4 and 1.5.

---

## 9. Frontend conventions (Next.js)

- Server Components by default; `"use client"` only for interactive islands (forms, menu, theme toggle).
- Pages render **per request** (required by the nonce-based CSP, see ADR 0007); static assets are still CDN-cached. Forms post via Server Actions with progressive enhancement (they work before JS hydrates).
- `src/lib/env.ts` validates env vars with Zod at build/start.
- SEO: `generateMetadata`, Open Graph image, `sitemap.ts`, `robots.ts`, JSON-LD (`Organization`, later `Article` for devotionals), canonical URLs.
- PWA: `app/manifest.ts`, icons and `viewport.themeColor` are part of the shell and are tested (manifest, icon and metadata unit tests; `tests/e2e/pwa.spec.ts` checks the manifest and icons load under the CSP). See section 5.
- Feature flags (simple env-based to start) gate Phase 2 routes so the framework exists but isn't public.
- Content in Phase 1 lives in the repo. Landing copy is typed data in `src/content/landing.ts`. Devotionals are markdown files with front matter in `apps/web/content/devotionals`, grouped by series in `content/series`, validated by `src/lib/devotionals` and shown from their `publishAt` date (UTC) with no redeploy; `pnpm check:devotionals` and `pnpm check:placeholders` are the gates. Set `DEVOTIONAL_TODAY` to preview another day. Devotionals are credited to "H". Phase 2 decides between DB-backed content with an admin UI (default plan) or a headless CMS (see §15).
- **Page changes and smooth scrolling:** `<html>` carries `data-scroll-behavior="smooth"`. Next 16 no longer pauses the `scroll-behavior: smooth` in `globals.css` during a page change, and without the attribute a tap from the top of the landing page opened the devotional at its Subscribe band (the router scrolls several elements and the smooth scroll won). `tests/e2e/bottom-nav.spec.ts` covers it.
- **Bible reader (behind `BIBLE_ENABLED=1`, plan in [bible_feature.md](docs/bible_feature.md)):** BSB and WEB are public domain and live in the repo as generated JSON (`apps/web/content/bibles`, built from USFM by `pnpm build:bible`, traced only into `/bible/**` so no other route ships them); the ESV will come from the Crossway API, never stored. One URL per passage: `/bible/<version>/<book>/<chapter>?v=16-18`. Picker: from `lg` a passage button opens a three-column popover (books with a filter, chapters in pages of 25, a verse grid where one click is one verse and a second click a range); below `lg` a bottom sheet with Book, Chapter and Verses tabs that show the current choice. Nothing applies until Read. The choice logic is shared (`use-passage-picker.ts`, `picker-parts.tsx`); every mounted picker needs its own radio group name (`useId`), because two pickers sharing a name become one group. The last Bible read (`bible-version`) and the passage you were reading (`bible-passage`, validated against the real books and chapters) are kept in first-party cookies, so `/bible` resumes there and a first visit opens John 3:16.
- **Ask the Word chat (built, behind `CHAT_ENABLED`, scope in [chat.md](docs/archive/chat.md)):** a client component loaded with a dynamic import on first click (landing JS budget untouched), Radix Dialog as a right-hand drawer from `lg` and a full-height sheet below it. Answers are knowledge base text rendered as plain text (no HTML, no external links; verse references link to the Bible reader). Follow-up buttons send entry ids. The thread is kept in `sessionStorage` only, with a Clear chat button. Without JavaScript or with the flag off, the button is a mail link to `hello@wordonthewater.net` (there is no contact form at launch).
- **Scripture copyright:** ESV quotations follow Crossway's free terms (api.esv.org). The footer on every page except the Bible reader (which fills the screen with no footer, decided 2026-11-15, and shows only the public-domain BSB and WEB) carries the full standard notice, the line "Users may not copy or download more than 500 verses of the ESV Bible or more than one half of any book of the ESV Bible", and a link to www.esv.org (its own 44px row). Each quotation is labelled "(ESV)". **When the ESV is added to the reader, its Crossway notice and the www.esv.org link must be shown in the reader itself, because there is no footer there.** Do not publish more than 500 verses or half a book on a page; treat 25% of the work as the stricter limit. The free terms cover non-commercial sites only: no charges, donations, advertising or sponsorship without a Crossway license. A full in-app Bible would also need a license, or a public-domain version such as the BSB or WEB. Keep scripture references structured (`book`, `chapter`, `verse`) so translations can be swapped.

---

## 10. Testing strategy

| Level | Tools | Expectation |
|---|---|---|
| API unit | pytest, pytest-asyncio | Services and validators, ≥ 85% coverage on `services/` |
| API integration | pytest against real Postgres, Valkey and Mailpit (Docker Compose locally, GitHub Actions service containers in CI), `httpx2` test client | Every endpoint incl. rate limit, enumeration-safety and token expiry cases |
| Web unit/component | Vitest + Testing Library | Forms, validation messages, theme toggle |
| E2E | **Playwright** on mobile viewports (iPhone 13/SE, Pixel 7) + desktop Chromium/WebKit/Firefox | Sign-up flow end to end using Mailpit, prayer form, navigation |
| Accessibility | `@axe-core/playwright` | Zero serious/critical violations |
| Performance | Lighthouse CI (mobile) | Budgets in §5 |
| Security | ZAP baseline scan (weekly, `zap.yml`; against staging once there is one) | No high findings |

Rule: write tests first (red, green, refactor) for all logic; a bug fix comes with a test that fails before the fix. `docs/PLAN.md` has the full testing approach and definition of done.

---

## 11. Environments and CI/CD

Environments: **local** (Docker Compose for data services, Mailpit catches email, Turnstile test keys) → **preview** (Vercel preview deployment of web and API for every PR, each with its own Neon database branch via the Neon–Vercel integration) → **staging** (a custom Vercel environment on Pro, or a long-lived `staging` branch with its own domain) → **production**.

Deployment is done by **Vercel's Git integration**; GitHub Actions does not build or upload the app. Monorepo settings: each Vercel project has its Root Directory set and an "Ignored Build Step" (`npx turbo-ignore` or a `git diff` check) so a docs-only change doesn't redeploy both apps.

`ci.yml` on every PR and push to `main`: **API** (ruff, format check, mypy, migrations, pytest with an 85% coverage gate on `services/`, against Postgres, Valkey and Mailpit service containers), **Web** (eslint, prettier, tsc, Vitest, build), **types** (`make types-check` fails if the generated API types are stale) and **e2e** (Playwright on iPhone SE/13, Pixel 7, desktop Chromium/WebKit/Firefox). `security.yml` runs gitleaks, pip-audit, Bandit, pnpm audit and OSV-Scanner (also weekly). `codeql.yml` covers TypeScript and Python. `neon-preview-cleanup.yml` deletes a PR's Neon preview branch when the PR closes (Free plan limit of 10 branches). `zap.yml` runs a ZAP baseline scan of a local production build weekly and on demand and fails on a High finding (against staging once there is one). Lighthouse CI is the `lighthouse` job in `ci.yml` (real throttling) and axe runs in the e2e suite. All actions are pinned to commit SHAs and workflows default to read-only permissions.

**Branch protection on `main`:** pull request required, 10 required checks, 1 approving review, no force-push or deletion, linear history, conversations resolved. Admins are not enforced, so the owner merges with `gh pr merge --admin` once checks are green (a solo owner cannot approve their own PR).

`migrate.yml` (planned after launch and before Phase 2, see [post_launch.md](docs/post_launch.md); until then migrations run by hand, apply first and promote second) on merge to `main`: run Alembic migrations against production with the direct (unpooled) `app_migrator` URL, gated by a **manual approval** GitHub Environment, *before* Vercel promotes the new production deployment (production auto-promotion is turned off; promotion happens after migrations succeed and smoke tests pass against the staged deployment). Preview branches run migrations on their own Neon branch in the Vercel build step. Rollback is Vercel **Instant Rollback** to the previous deployment. Migrations must be backward compatible (expand → migrate → contract) so a rollback of app code is always safe.

Conventional Commits; small PRs; every PR uses the template (what, why, screenshots on mobile, security considerations, tests).

---

## 12. Email

Two systems, split by purpose:

| Kind | System | Mail |
|---|---|---|
| Subscriber-facing | **Kit** | Double opt-in confirmation, welcome, weekly devotional broadcasts. Kit adds the unsubscribe link and legal address |
| Transactional | **Postmark** via `EmailProvider` and the outbox | Prayer-team notification, contact notification, prayer-request received (to requester, optional) |

- **Kit integration:** API v4 at `https://api.kit.com/v4`, `X-Kit-Api-Key` header (an API key is right for automating our own account; OAuth is only needed for multi-account apps and bulk endpoints). Sign-up: create the subscriber as `state: "inactive"` (`POST /subscribers`, an upsert; the default `active` would skip double opt-in), then add it to the double opt-in form by id, and Kit sends the confirmation (proven in the 1.3 spike); unsubscribe: `POST /subscribers/{id}/unsubscribe`. Webhooks (paid Kit plans only, skipped at launch) via `POST /webhook_endpoints` with events `subscriber.activated`, `subscriber.unsubscribed`, `subscriber.bounced`, `subscriber.complained`. Broadcasts (built in 2.4, proven 2026-11-14): `POST /broadcasts` creates a draft only (`send_at` null, `public` false). `PUT /broadcasts/{id}` with `send_at` schedules it, and a PUT resets every field it does not carry, so every field (sender, audience, template) is sent each time. A new broadcast defaults to all subscribers, so the audience is always explicit. The Text only template adds the unsubscribe link and postal address itself (plus a "Built with Kit" badge on the free plan) and drops blockquote styling, so our HTML carries inline styles. Sent broadcasts cannot be deleted through the API. The preview and live keys are the same Kit account. The weekly steps and the image rule are in [kit_email_devotional.md](docs/kit_email_devotional.md), the file format in [devotional_format.md](docs/devotional_format.md); details and open points are in ADR 0008.
- **Kit is the list's source of truth.** Our `subscribers` table is a mirror for status, consent evidence and retention. If the two disagree, Kit wins.
- Kit failures never lose a sign-up: the call runs from the outbox with retries.
- **Domain and addresses.** The domain is `wordonthewater.net`. Two mailboxes are registered:

  | Address | Used for |
  |---|---|
  | `hello@wordonthewater.net` | Public contact address; `From` and `Reply-To` of all outgoing mail (Kit newsletters and confirmation, Postmark transactional); recipient of contact-form notifications; security reports until a `security@` alias exists |
  | `prayer@wordonthewater.net` | Public prayer address on the page; recipient of prayer-request notifications from Postmark; reply address for prayer follow-ups |

  The addresses live in configuration, not code: `EMAIL_FROM` (`Word on the Water <hello@wordonthewater.net>`), plus the notification recipients `PRAYER_INBOX` and `CONTACT_INBOX`, set per environment. Preview and local runs never use the real addresses (Mailpit locally, test inboxes in Preview).

  **Both addresses are Squarespace email forwards to Hendrik's own mailbox; there is no hosted mailbox.** Consequences: nothing sends mail as these addresses except Kit and Postmark, so no mailbox provider belongs in SPF; forwarded mail can fail SPF or DMARC at the final mailbox, so delivery of notifications is tested end to end (step 1.9) and, if forwarding proves unreliable, `PRAYER_INBOX` and `CONTACT_INBOX` point straight at the destination mailbox while the public addresses stay `hello@` and `prayer@`; replying as `hello@` or `prayer@` needs "send mail as" set up in the receiving mailbox, otherwise replies come from the personal address.
- Domain authentication before launch, on the root domain because the `From` addresses are on it: **SPF** (one record that includes Postmark and Kit; keep anything Squarespace's email forwarding already put in the existing record and edit it, never add a second), **DKIM** for each sender, **DMARC** at `_dmarc.wordonthewater.net` (start `p=none` with reporting to `hello@wordonthewater.net`, move to `quarantine`), a custom return-path per sender, and Kit's own sending-domain setup. Only one SPF record may exist; merge the includes. The domain already publishes DMARC `p=reject` with strict alignment and an SPF of `include:mailgun.org` only (found 2026-11-14): until Kit and Postmark sign with DKIM for `wordonthewater.net`, their mail from `hello@` is very likely rejected (production_checklist.md, Parts E and K).
- Transactional templates: plain-text part always included; mobile-friendly HTML.
- Every newsletter has a working one-click unsubscribe and the physical/contact details required by law (Kit supplies both; verify in a test send).
- Tests mock Kit with a fake server and never call real Kit; Preview and Development use a separate Kit test form or account.

---

## 13. Delivery phases

Progress is tracked step by step in [PLAN.md](docs/PLAN.md); this section only describes scope.

| Phase | Status |
|---|---|
| 0 Foundations | Exit gate passed 2026-11-01 (carry-over: web coverage in CI) |
| 1 Landing page | In progress (1.1, 1.2 and 1.3 done, devotional page built, Bible reader built behind a flag, the 2.4 weekly email draft command built ahead; the prayer and contact forms 1.4 and 1.5 are deferred past launch; the Ask the Word chat is scoped as step 1.10). The site went live on 2026-11-21 (launch Saturday 28 November); the remaining steps are in `docs/production_checklist.md` |
| 2 Devotionals and admin | Not started |
| 3 Teaching series and audio | Not started |
| 4 Community | Not started (decision gate) |

### Phase 0 — Foundations (framework in place, nothing public yet)
Monorepo, local Docker services, Makefile and env setup; Vercel team, two projects, Neon and Upstash, scoped env vars; Next.js shell with tokens, fonts, security headers and CSP; FastAPI app factory with settings, logging, request IDs, errors, health, service-token auth and rate limiter; SQLAlchemy and Alembic with DB roles and the first migration; email provider interface with outbox worker; OpenAPI to TypeScript types; CI, CodeQL, Dependabot, branch protection and pre-commit hooks; staging, Sentry, uptime monitoring, analytics and log drain; ADRs, threat model v1 and privacy doc v1.

### Phase 1 — Landing page (first public release)
All mockup sections as responsive mobile-first components; final colour scheme with light and dark; email sign-up through Kit with double opt-in (Kit hosts confirm and unsubscribe), plus a mirror of the Kit list (the webhook needs a paid plan, so a daily sync does it); prayer request form (encrypted storage, team notification, optional reply) and contact form; privacy policy, ESV copyright notice and `security.txt`; SEO metadata, OG image, sitemap and manifest; retention job; full test suite with Lighthouse and axe budgets met and ZAP baseline clean; Vercel Pro, domain, Firewall rules, SPF/DKIM/DMARC, production deploy and a tested backup restore.
- **Exit criteria:** a visitor on a mid-range phone can read the page, subscribe and confirm, and reach `hello@` (the prayer and contact forms are deferred past launch, and the prayer option is not on the page until they are built); no high security findings.

### Phase 2 — Devotionals and admin
Admin login (passkey/magic link + 2FA), RBAC, admin UI for prayer requests (with audit log), devotional authoring and publishing, devotional archive and detail pages (ISR), weekly email as Kit broadcasts created from published devotionals, RSS feed, basic search (Postgres full-text). Decision gate: revisit the native Flutter app ([FLUTTER.md](docs/FLUTTER.md), option B). Web Push is planned separately, after the PWA ([web_push.md](docs/web_push.md)).

### Phase 3 — Teaching series and audio
Series pages, audio upload to Vercel Blob (or R2) with signed URLs, podcast RSS feed, embedded player, offline-friendly PWA caching of recent devotionals. If the Phase 2 gate chose it, the Flutter app for iOS and Android is built here.

### Phase 4 — Community (only if wanted)
Optional public accounts (save favourites, reading plans), comments with moderation, giving/donations via a hosted provider (Stripe Checkout; never handle card data ourselves). Donations are not planned; if ever added, first obtain the Crossway ESV license, because the free ESV terms cover non-commercial sites only.

---

## 14. Working rules for Claude Code / contributors

- Read this file and the relevant ADRs before starting. Propose an ADR for any decision that changes the stack, data model or security posture.
- **Mobile first, always**: build and screenshot at 375px before wider widths.
- Never commit secrets, real prayer requests or real subscriber data. Use fixtures.
- Never log or send to third parties (Sentry, analytics) any personal data or prayer content.
- New endpoint checklist: Pydantic schema with `extra="forbid"` and limits → permission dependency → rate limit → service-layer logic → tests (happy path, validation, auth, rate limit) → OpenAPI types regenerated → threat model updated if it handles personal data.
- DB changes only via Alembic migrations, reviewed, backward compatible.
- Keep the landing page JS budget; prefer Server Components.
- Run before every PR: `make lint typecheck test` (and `make e2e` for UI changes).
- **Workflow:** one branch and one PR per plan sub-step (for example `feat/0.9-vercel`), Conventional Commits, one commit per logical chunk, push once per sub-step. Merge with `gh pr merge --squash --admin` only when every check is green.
- **Branch names of 36 characters or fewer.** A web preview finds its API preview by swapping the project name in its alias, and Vercel truncates aliases over 63 characters with a hash that differs per project, so the swap breaks (the web preview then fails with a message naming the cause). Dependabot branches always exceed this; set `API_BASE_URL` on such a preview if you need it to work.
- **Tests first** (red, green, refactor), shown failing for the right reason before the code is written. See the testing approach in `docs/PLAN.md`.
- Check `git status` and stage named files before committing; never a blanket `git add -A` (it once committed locally installed files to the public repo).
- Dependabot npm PRs do not update the root `pnpm-lock.yaml`: check out the PR, run `pnpm install`, commit the lockfile and push before merging (see PLAN.md 0.8). `@playwright/test` is held at exactly 1.64.1: 1.65.0 ships Firefox 159, where four `desktop-firefox` tests crash with "Page crashed" (PR #90, 2026-11-14); try the next release, then restore the caret range. `.github/dependabot.yml` ignores 1.65.x, so Dependabot proposes the next release instead; remove that entry when one passes.
- Python tooling always through `uv` (`uv run`, `uv add`); no bare `python3` or `pip`. Use the latest stable library APIs. For Next.js, read the bundled docs in `node_modules/next/dist/docs/` first: this is not the Next you may remember (`proxy.ts` replaces `middleware.ts`).
- Reproduce and prove the root cause of a problem before fixing it, and record problems found along the way in the PR.

### Commands

```
make setup        # create .env with random local secrets (never overwrites an existing .env)
make up / down    # docker compose: postgres, redis, mailpit (make logs to follow)
make migrate      # alembic upgrade head (as app_migrator)
make lint         # ruff + eslint + prettier --check
make typecheck    # mypy + tsc
make test         # pytest + vitest
make e2e          # playwright, all six projects (builds and serves the app)
make types        # regenerate packages/api-types from the OpenAPI schema
make types-check  # regenerate and fail if the committed types differ (runs in CI)
make kb           # rebuild the chat knowledge base JSON and chat-topics.json from apps/api/kb/faith_kb.md
make kb-check     # fail if the committed knowledge base JSON differs from its markdown (runs in CI)
```

In `apps/web`: `pnpm make:icons` (render every icon from `src/app/icon.svg`) and `pnpm make:screenshots` (retake the manifest screenshots from a running production build), `pnpm check:devotionals`, `pnpm check:placeholders` (content gates), `pnpm build:bible` (regenerate the Bible data) and `pnpm broadcast:devotional <folder> --tag <id>|--all` (create a Kit draft broadcast from a devotional, never sends). Handy flags in the root `.env`: `DEVOTIONAL_TODAY=2026-12-20` (pretend it is another day), `BIBLE_ENABLED=1` (show the Bible reader), `CHAT_ENABLED=1` (show the Ask the Word chat; set it on the API too) and `DEV_ORIGINS=<your Wi-Fi address>` (open `pnpm dev` on a phone on the same network; Next blocks other hosts by default). Do not `export` `DEVOTIONAL_TODAY`, `BIBLE_ENABLED` or `CHAT_ENABLED` in your shell: the unit tests read them and about 20 fail (CI does not set them). If your shell does export them, run the tests with `env -u DEVOTIONAL_TODAY -u BIBLE_ENABLED -u CHAT_ENABLED pnpm vitest run`. `make kit-webhook URL=https://<site>/api/webhooks/kit` registers the Kit webhook (not used at launch: needs a paid Kit plan).

Local runs read the root `.env` written by `make setup` (Vercel Development has no variables, so there is nothing to pull). Run the apps with `uv run uvicorn app.main:app` in `apps/api` and `pnpm dev` in `apps/web`. Playwright's Firefox does not launch on the current macOS beta; CI covers it. E2E tests run fully parallel, so a stub must never keep one global "last request": key it (the Kit webhook stub failed that way, PR #92).

---

## 15. Open questions and current assumptions

| # | Question | Assumption until answered |
|---|---|---|
| 1 | Monthly budget, and which region is closest to most of your audience? | Vercel (decided) with Neon + Upstash; Hobby while building, Pro (~USD 20–40/month) at launch. **Region resolved:** `fra1` (Europe/Africa) |
| 2 | Domain name registered? | **Resolved:** `wordonthewater.net`, with `hello@wordonthewater.net` and `prayer@wordonthewater.net` registered |
| 3 | Email provider? | **Resolved for subscriptions:** Kit. Postmark (assumed) stays for transactional mail |
| 4 | Who reads prayer requests in Phase 1, and may the full text be emailed to them? | Hendrik only; full text emailed only if the requester ticks consent, otherwise stored encrypted for the Phase 2 admin view |
| 5 | Auth needs: admin only, or public accounts eventually? | Admin-only (Phase 2); public accounts optional in Phase 4 |
| 6 | Where are you and your audience based (for privacy law)? | Design to GDPR + POPIA, which covers most jurisdictions |
| 7 | Content management: write devotionals in a built-in admin, or use a headless CMS? | Built-in admin in Phase 2 |
| 8 | Which colour scheme from the mockup? | **Resolved:** Dawn patrol (light) and Night swell (dark), applied to the tokens |
| 9 | Will there be donations/giving? | **Resolved:** no donations. If that changes, get the Crossway ESV license first, then hosted checkout only |
| 10 | Where should the repository live (GitHub account/org, name)? | **Resolved:** public repo `thecodeblock-hendrik/word-on-the-water`, no license |

### Decisions made during the build

- **Domain and mailboxes (2026-10-31):** production domain `wordonthewater.net`; `hello@` (public contact, all outgoing mail, contact notifications) and `prayer@` (prayer notifications). Mail is authenticated on the root domain, not a `mail.` subdomain, because the `From` addresses are on the root. DNS stays at Squarespace; all records (Vercel, SPF, DKIM, DMARC, return-paths) are added there.
- **Kit for subscriptions and newsletters (2026-10-31):** Kit owns the list, double opt-in, unsubscribe and broadcasts; we keep a mirror table and verify Kit webhooks. Kit has no transactional send API, so Postmark stays for prayer and contact notifications. This replaces our own token-based confirm and unsubscribe endpoints and the Postmark broadcast idea (ADR 0008, written with the 1.3 spike).
- **Free site and ESV (2026-11-07):** the site is completely free to access and takes no donations, so the ESV is used under Crossway's free non-commercial terms. If giving, advertising or sponsorship is ever added, obtain a Crossway license first.
- **Devotionals in the repo (2026-11-06):** Phase 1 devotionals and series are markdown and YAML files in `apps/web/content`, not database rows, so publishing needs only a pull request. Phase 2 revisits an admin UI.
- **Database:** stay with Neon, not Supabase: native Vercel integration, a database branch per preview, and scale to zero on the free tier. Supabase would add an auto-generated REST API to lock down (ADR 0002).
- **CSP:** nonce-based, so pages render per request. A hash-based CSP with static pages was tried first and failed in a real browser (8 inline hydration scripts blocked). Re-measure LCP on a preview deployment (ADR 0007).
- **Licensing and visibility:** no license (all rights reserved); repository public.
- **Testing:** test-first for all logic, with a definition of done per step (`docs/PLAN.md`).
- **Branch protection:** the owner is not enforced, so a solo developer can merge once checks are green.
- **Mobile strategy:** option B in `docs/FLUTTER.md`. The Next.js site stays the public, SEO-friendly mobile experience and becomes an installable PWA (`app/manifest.ts`) in Phase 1. A Flutter app for iOS and Android, on the same Vercel, Neon and FastAPI, is revisited at the Phase 2 gate. Replacing Next.js with Flutter web was rejected: it cannot meet the SEO, first-load and accessibility budgets for the landing page.
- **Bible reader (2026-11-07):** built ahead of the Phase 1 plan as its own feature behind `BIBLE_ENABLED`. BSB first and WEB second (both public domain, stored in the repo), ESV third from the API once Crossway approves. Picker redesign chosen from three options each for desktop and phone (mockups in `docs/design/bible_mockups.html`): the columns popover (desktop) and the tabbed sheet (phone). A type-it search box is a possible later shortcut. The version cookie is a functional preference like the theme cookie.
- **Neon previews (2026-11-08):** preview branching is on: Vercel creates a Neon branch `preview/<git branch>` from `preview-base` (the Default branch) the first time a git branch builds, and the copy keeps the passwords and schema `preview-base` had then. After production `main` was restored from `preview-base`, the lineage is `main_old_...` (backup, root) then `preview-base` then `main` and the previews. Never use "Reset from parent" on `main`. Each new migration and the `app_runtime` password (equal to the Preview `DB_RUNTIME_PASSWORD`) must be applied to `preview-base` first; an existing PR branch must be fixed on its own. The step-by-step history is in `docs/archive/neon_vercel_checks.md`.
- **Kit webhook path (2026-11-08):** Kit cannot pass the API project's Vercel login wall, so Kit calls a forwarder route on the web project (`/api/webhooks/kit`) that passes the raw body and signature to the API and adds the bypass secret server-side; the API checks the signature (ADR 0008). Previews are behind the login wall too, so the webhook is registered for production only.
- **Turnstile hostnames (2026-11-08):** a widget refuses every hostname not on its list (error 110200). The production widget lists only `wordonthewater.net` and `www.wordonthewater.net`, so production sign-up can only be tested on the real domain; the preview widget lists `localhost` and `vercel.app`.
- **Launch-time steps kept apart (2026-11-08):** everything that needs the live domain or is only needed just before launch (the PWA conversion, Vercel Pro, DNS and email authentication, the Kit redirect and webhook registration, the smoke test) lives in `docs/production_checklist.md`, not in PLAN.md. The domain stayed inactive until Part G of that checklist (done 2026-11-21).
- **Weekly email is a draft command, not an automatic send (2026-11-14):** `pnpm broadcast:devotional` (TypeScript in `apps/web`, reusing the devotional loader) creates a Kit draft; a person reviews and schedules it in Kit, so nothing can go out by accident. The Python `KitClient.create_broadcast` exists and is tested for when the Phase 2 admin UI takes over. Look: full dark Night swell email, series banner on top, scripture and quotes styled inline. Spike and findings: ADR 0008.
- **Preview databases are migrated by hand (2026-11-14):** `migrate.yml` covers production only, after launch and before Phase 2 (docs/post_launch.md). Automating previews would put the DDL-capable `app_migrator` password in Preview build variables. Rule for a PR that adds a migration: apply it to `preview-base` first, then check the PR's own preview branch (PLAN.md 1.3, runbooks/deploy.md).
- **No Kit webhook at launch (2026-11-21):** Kit's webhook endpoints need a paid plan (the free plan's API key gets 401 on `/v4/webhook_endpoints`), and we stay on the free plan. Kit still sends, confirms and unsubscribes; our `subscribers` mirror would otherwise stay `pending`. The receiver and `make kit-webhook` stay in the code for a paid plan; a daily sync from Kit's API (`/cron/sync-kit`, 03:00 UTC, before the 03:30 retention job so confirmed people are active before pending rows are deleted) keeps the mirror right instead (built 2026-11-21, PLAN.md 1.3, ADR 0008). Switching provider was rejected for launch.
- **Playwright held at 1.64.1 (2026-11-14):** see section 14. **Email domain finding (2026-11-14):** DMARC `p=reject` already exists on `wordonthewater.net`, so Kit's DKIM is a hard prerequisite for any real send (production_checklist.md Parts E and K).
- **Prayer and contact forms are not part of the launch (2026-11-14):** steps 1.4 and 1.5 move after launch. The page has no prayer option (the Prayer link was removed from the menus and footer on 2026-11-15, and `prayer@` is no longer named on the page or in the privacy policy); `hello@wordonthewater.net` is the contact address. The contact form, `PRAYER_INBOX` and `CONTACT_INBOX` work, and the prayer encryption, wait until they are built. The Phase 1 exit criteria and the launch checklist no longer include sending a prayer request.
- **Ask the Word chat from a local knowledge base (2026-11-14):** the first design (an LLM on OpenRouter with a web search limited to GotQuestions.org, Bible.org and BibleProject) was dropped because of POPIA and GDPR exposure of faith questions, copyright in the three sites' text, hallucination and third-party cost. v1 answers only from our own original knowledge base (`faith_kb.json`, built by `build_kb.py` from markdown), with follow-ups, history in the visitor's tab only and nothing stored on the server. No pastoral review gate (decided 2026-11-15); the crisis text uses South African numbers (verify before launch). A later LLM that only rephrases retrieved entries needs its own ADR first (ADR 0009, [chat.md](docs/archive/chat.md)).
- **PWA built (2026-11-17, PR #136):** one navy icon set and colour pair for both themes, the short name "WotW" for the manifest and the iOS label, shortcuts Start here and Bible, three phone screenshots, no service worker. Skipped for now and decided with Web Push and Phase 3: an offline fallback page, iOS launch screens and a wide desktop screenshot. The proxy matcher is unchanged (the manifest and icons get a nonce header, which is harmless).
- **Email images live on our own site (2026-11-17, PR #138):** the first test email lost its image when the branch its address pointed at was deleted. Banners are plain files in `apps/web/public/email`, named by `emailBanner` in `series.yml` and served from `https://wordonthewater.net/email/<file>`, a fixed address that never changes (no branch, no hash, no overwrite; a changed banner gets a new file name). Kit's API has no image upload. `pnpm broadcast:devotional` checks the address answers with an image before it makes a draft, so before launch it refuses unless `EMAIL_IMAGE_BASE` points at a banner merged to `main` (tests only, never for a real send). Option chosen over uploading to Kit, GitHub raw files and a separate bucket.
- **Accepted vulnerability, picomatch (2026-11-17, PR #137):** OSV widened `GHSA-fc5q-39xc-vjpf` to every picomatch release, so there is nothing to upgrade to. It is dev tooling only (eslint, typescript-eslint, tinyglobby), so it is ignored in `osv-scanner.toml` and in `pnpm-workspace.yaml` (`auditConfig.ignoreGhsas`) until 2026-12-15; remove both together when a fixed version exists.
- **PWA has no orientation lock (2026-11-16):** the manifest leaves `orientation` out, because a portrait lock fails WCAG 1.3.4 (we target 2.2 AA) and nothing needs it. Open before building: a minimal offline fallback page now or in Phase 3, iOS launch screens, a wide desktop screenshot ([PWA_checklist.md](docs/PWA_checklist.md) step 1).
- **Ask the Word, and the phone bottom bar (2026-11-22):** the chat was called Got Questions until now. The name clashed with GotQuestions.org and sounded like general questions, so it is "Ask the Word" everywhere (bar, menus, Start here button, chat title, messages). The phone bottom bar replaced the idea of separate chat buttons on phones; leaving the chat clears it with an undo toast instead of a confirmation question, and only on phones (the desktop drawer keeps its thread). Scroll-direction auto-hide of the bar is a proposal with mockups, not built.
- **Web Push planned after the PWA (2026-11-16):** self-built and free (standard Web Push with our own VAPID keys, sent from FastAPI, Next as the BFF), one notification a week for a new devotional only, one fixed send time (about 05:00 South African time automatic, about 08:00 when sent by hand, manual for the first month), anonymous subscriptions with the keys encrypted at rest, and one service worker shared with the PWA's offline decision. No longer a Phase 2 gate decision. [ADR 0011](docs/adr/0011-web-push.md) is proposed and becomes accepted when the spike W1 confirms the library ([web_push.md](docs/web_push.md)).
