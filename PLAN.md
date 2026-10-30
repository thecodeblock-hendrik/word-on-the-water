# PLAN.md - Word on the Water

Step-by-step build plan derived from `CLAUDE.md`. Tick boxes as work completes. When this plan and `CLAUDE.md` disagree, fix one of them in the same change.

## How to use this plan

- Work top to bottom. Do not start a phase until the previous phase's **Exit gate** is ticked.
- Each step is small. Validate it (run it, test it, look at it) before ticking.
- Bugs: reproduce, prove the root cause, then fix, with a test that failed before the fix.
- Before adding a dependency or using an API, check the current docs and use the latest stable version.
- Security items are part of each phase, not a separate phase at the end.
- Anything that changes the stack, data model or security posture needs an ADR first.

Legend: `[ ]` todo, `[x]` done. **(Hendrik)** marks a decision or action needed from the owner.

---

## Phase 0 - Foundations (nothing public)

### 0.1 Repository and tooling
- [x] `git init`, `.gitignore` (node, python, env files, `.vercel`, build output), `.gitattributes`
- [x] Create GitHub repo `word-on-the-water` (private, thecodeblock-hendrik)
- [x] Monorepo skeleton: `apps/web`, `apps/api`, `packages/api-types`, `docs/{adr,runbooks}`, `.github`
- [x] `README.md` (concise quick start), `SECURITY.md`
- [ ] `LICENSE` decision **(Hendrik)**
- [x] `.editorconfig`, `.env.example` (names only, no values)
- [x] `docker-compose.yml`: Postgres 17 (with `citext`, `pgcrypto`), Redis/Valkey, Mailpit
- [x] Validate: `docker compose up` brings all three healthy; connect with `psql`, `redis-cli`; Mailpit UI loads
- [x] `Makefile` base targets: `setup up down logs`
- [ ] Makefile targets `env migrate lint typecheck test e2e types` (added as each app lands)
- [x] Pre-commit hooks: gitleaks, file hygiene, Conventional Commits
- [ ] Pre-commit hooks: ruff, prettier, eslint (added when `apps/api` and `apps/web` exist)
- [x] Validate: committing a fake secret is blocked

### 0.2 Decision records
- [ ] ADR 0001 BFF (browser never calls FastAPI)
- [ ] ADR 0002 PostgreSQL via Neon
- [ ] ADR 0003 Auth approach (no login in Phase 1; admin passkey/magic link + 2FA in Phase 2)
- [ ] ADR 0004 Email provider interface + Postmark
- [ ] ADR 0005 Hosting on Vercel (two projects, Marketplace data services)
- [ ] ADR 0006 Application-layer encryption of prayer requests

### 0.3 API skeleton (`apps/api`)
- [ ] `uv init`, Python 3.13, `pyproject.toml` with separate `dev` group (pytest, ruff, mypy, bandit, pip-audit)
- [ ] Add runtime deps (latest): fastapi, uvicorn, pydantic, pydantic-settings, sqlalchemy[asyncio], asyncpg, alembic, structlog, cryptography, httpx, redis client
- [ ] `app/core/config.py`: `pydantic-settings`, fail fast on missing secrets
- [ ] `app/main.py`: app factory, router registration, `/docs` and `/openapi.json` disabled in production
- [ ] `app/core/logging.py`: structlog JSON, request ID middleware, never log bodies
- [ ] Error handlers returning `{ "error": { "code", "message" } }`, no stack traces
- [ ] Security middleware: `Cache-Control: no-store`, content-type checks, body size limit
- [ ] `routers/health.py`: `/health/live`, `/health/ready` (DB + Redis)
- [ ] `core/security.py`: service-token dependency (constant-time compare), default deny on non-health routes
- [ ] `core/rate_limit.py`: Redis sliding window keyed by hashed IP and email; generic 429
- [ ] Client IP taken only from Vercel-set headers
- [ ] Tests: health, auth rejected without token, rate limit trips, error shape
- [ ] Validate: `uv run pytest`, `uv run ruff check`, `uv run mypy --strict` all green

### 0.4 Database
- [ ] `db/session.py`: async engine, `NullPool`, short timeouts, TLS
- [ ] `db/base.py`: declarative base, UUID v7 id mixin, `created_at/updated_at` (UTC)
- [ ] Alembic configured to use the direct (unpooled) URL
- [ ] Models: `subscribers`, `prayer_requests`, `contact_messages`, `email_outbox`, `audit_log` (per CLAUDE.md section 7)
- [ ] First migration generated, reviewed by hand, applied locally
- [ ] DB roles: `app_migrator` (DDL) and `app_runtime` (DML only); runtime role cannot alter schema
- [ ] Validate: migrate up, down, up again on a clean database; runtime role denied DDL

### 0.5 Email and outbox
- [ ] `EmailProvider` interface in `integrations/email/`
- [ ] Console and Mailpit (SMTP) implementations; Postmark implementation
- [ ] Template renderer (plain text always, mobile-friendly HTML)
- [ ] Outbox service: enqueue in same transaction as the business write
- [ ] `jobs/drain_outbox.py`: lock rows, send, retry with backoff, mark failed after N attempts
- [ ] Cron endpoint protected by `Authorization: Bearer $CRON_SECRET`
- [ ] Tests: enqueue, drain success, drain failure and retry, cron auth
- [ ] Validate: enqueued email appears in Mailpit

### 0.6 Web skeleton (`apps/web`)
- [ ] Create Next.js (latest stable, App Router, TypeScript strict), pnpm
- [ ] Tailwind CSS v4 with `src/styles/tokens.css` (mockup tokens, navy/teal/sand default)
- [ ] Fonts via `next/font`: Barlow Condensed, Barlow, Lora (self-hosted, Latin, `display: swap`)
- [ ] Root layout, skip link, header, footer, `not-found.tsx`, `error.tsx`
- [ ] `middleware.ts`: CSP with per-request nonce (report-only first), HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP; remove `X-Powered-By`
- [ ] `src/lib/env.ts`: Zod validation; `server-only` on every secret-touching module
- [ ] `src/lib/api-client.ts`: server-side calls with service token and forwarded client IP
- [ ] `api/health/route.ts`
- [ ] ESLint, Prettier, Vitest + Testing Library, Playwright configured
- [ ] Validate: `pnpm dev` renders shell at 375px; response headers verified with `curl -I`

### 0.7 OpenAPI types pipeline
- [ ] Script exports OpenAPI from FastAPI to a file
- [ ] `openapi-typescript` generates `packages/api-types`
- [ ] `make types` works; CI fails if generated types are stale

### 0.8 CI and repo protection
- [ ] `ci.yml`: frozen installs, lint, type-check, unit tests, integration tests (service containers), build
- [ ] `codeql.yml` (TypeScript, Python)
- [ ] `security.yml`: gitleaks, pip-audit, pnpm audit, OSV-Scanner, Bandit
- [ ] Actions pinned to commit SHAs; least-privilege `permissions:`
- [ ] `dependabot.yml` (weekly, grouped)
- [ ] PR template (what, why, mobile screenshots, security considerations, tests)
- [ ] Branch protection on `main`: PR required, checks green, 1 review, no force-push
- [ ] Validate: a test PR runs every workflow green

### 0.9 Vercel and external services
- [ ] Vercel team with 2FA for all members
- [ ] Projects `wotw-web` (root `apps/web`) and `wotw-api` (root `apps/api`) linked to GitHub
- [ ] Ignored Build Step per project so docs-only changes do not redeploy
- [ ] Region chosen and pinned for both projects and the database **(Hendrik: audience location)**
- [ ] Neon (Marketplace): pooled and direct URLs, branch per preview
- [ ] Upstash Redis (Marketplace)
- [ ] Env vars set per scope (Development, Preview, Production), secrets marked Sensitive, preview never gets production keys
- [ ] `apps/api/vercel.json`: Python runtime, region, `maxDuration`, crons (outbox every 5 min, retention daily)
- [ ] `apps/web/vercel.json`: region and headers
- [ ] Deployment Protection on previews; API only reachable by web (bypass secret) and Cron
- [ ] `make env` (`vercel env pull`) works for both projects
- [ ] Validate: preview deploy of both apps; web health route reaches API health through the BFF

### 0.10 Observability and docs
- [ ] Sentry in web and API with `sendDefaultPii: false` and `before_send` scrubbing
- [ ] Vercel Web Analytics and Speed Insights
- [ ] Uptime monitor on `/api/health`; log drain configured
- [ ] Staging environment (custom Vercel environment or `staging` branch with own domain)
- [ ] `docs/threat-model.md` v1 (STRIDE)
- [ ] `docs/privacy.md` v1 (data inventory, retention, lawful basis)
- [ ] Runbooks: `deploy.md`, `incident.md`, `restore-db.md`, `rotate-secrets.md`
- [ ] Nightly `pg_dump` workflow to separate encrypted storage

**Exit gate Phase 0**
- [ ] Fresh clone to running app using only `make setup && make up`
- [ ] CI green on `main`; preview deploys work for both projects
- [ ] Health checks pass end to end through BFF; secrets absent from the repo and client bundle
- [ ] ADRs, threat model v1, privacy v1 committed

---

## Phase 1 - Landing page (first public release)

### 1.1 Design system and layout (mobile first, 375px before wider)
- [ ] Finalise colour scheme and apply to tokens **(Hendrik)**
- [ ] Light and dark via `prefers-color-scheme` plus cookie-backed toggle (no flash on SSR)
- [ ] Shared UI primitives: button, input, textarea, checkbox, label, field error (Radix/shadcn style)
- [ ] Sticky header with single CTA; accessible mobile menu (Radix Dialog)
- [ ] Touch targets at least 44px; safe-area insets; `prefers-reduced-motion` respected
- [ ] Inline SVG logo using `--logo-ring` and `--logo-wave` tokens
- [ ] Tests: theme toggle, menu keyboard and focus behaviour

### 1.2 Page sections (statically generated, Server Components)
- [ ] Hero (Mark 4:41 + logo)
- [ ] About / who it is for
- [ ] What's coming (weekly devotional, teaching series, audio) with sample surf report
- [ ] Start here (gospel in 4 steps)
- [ ] Statement of faith
- [ ] Founder bio
- [ ] Footer with ESV copyright notice per Crossway permissions
- [ ] Scripture references stored as structured data (`book`, `chapter`, `verse`)
- [ ] Content in typed TS/MDX; mockup "design notes" and "Ideas for Hendrik" excluded
- [ ] Images via `next/image` (AVIF/WebP, explicit sizes, lazy below the fold)
- [ ] Screenshot review at 375, 768, 1280 against `website/landing-page-mockup.html`

### 1.3 Email sign-up (double opt-in)
- [ ] API: Pydantic schema (`extra="forbid"`, name <= 80, email <= 254)
- [ ] `POST /v1/subscribers`: always 202 with identical body (no enumeration across new, pending, confirmed)
- [ ] Token generation: 32 random bytes, store SHA-256 hash only, 48 hour expiry
- [ ] Turnstile verification, honeypot, minimum time-to-submit
- [ ] Rate limit 5/hour/IP; idempotency key support
- [ ] Consent text version, timestamp and source recorded
- [ ] Confirmation email via outbox
- [ ] `POST /v1/subscribers/confirm` and `/unsubscribe` (including RFC 8058 one-click)
- [ ] Web: `react-hook-form` + Zod, Server Action with progressive enhancement, visible labels, correct `type/inputmode/autocomplete`, errors in `aria-live`
- [ ] Pages: `/subscribe/confirm` and unsubscribe, with clear success, expired and invalid states
- [ ] Tests: happy path, validation, enumeration safety, expiry, replay, rate limit, bot rejection
- [ ] Threat model updated

### 1.4 Prayer request form
- [ ] `crypto.py`: AES-256-GCM envelope encryption, `key_id` per row, rotation supported
- [ ] Encryption key in secret manager; key rotation documented in runbook
- [ ] `POST /v1/prayer-requests` (202), text <= 2,000, `share_with_team` and `wants_reply` consent flags
- [ ] Rate limit 3/hour/IP; Turnstile; honeypot; idempotency
- [ ] Notification email: full text only if consent ticked, otherwise "a new request is waiting" **(Hendrik: confirm default)**
- [ ] `delete_after` set to 90 days
- [ ] Prayer text never in logs, Sentry or analytics (verified by test)
- [ ] Web form with same standards as sign-up
- [ ] Tests: encryption round trip, wrong key fails, consent branches, no-leak assertions
- [ ] Threat model updated

### 1.5 Contact form
- [ ] `POST /v1/contact` (202) with limits, Turnstile, honeypot, rate limit
- [ ] Notification via outbox; `delete_after` 12 months
- [ ] Web form and tests

### 1.6 Legal, SEO and trust
- [ ] Privacy policy page (matches `docs/privacy.md`) **(Hendrik: review)**
- [ ] `/.well-known/security.txt`
- [ ] `generateMetadata`, canonical URLs, Open Graph image, JSON-LD `Organization`
- [ ] `sitemap.ts`, `robots.ts`, `manifest.ts`, icons, theme colour
- [ ] Switch CSP from report-only to enforce after violations reviewed

### 1.7 Retention and operations
- [ ] Retention job: unconfirmed subscribers 7 days, prayer 90 days, contact 12 months, audit logs 1 year
- [ ] Tests with time-shifted fixtures
- [ ] Vercel Cron configured and verified in preview
- [ ] Alerts: error rate, 5xx, failed email sends, DB connection failures, cert expiry

### 1.8 Quality gates
- [ ] Playwright e2e on iPhone SE/13, Pixel 7, desktop Chromium/WebKit/Firefox: sign-up via Mailpit, prayer form, navigation
- [ ] `@axe-core/playwright` on every page: zero serious or critical
- [ ] Lighthouse CI mobile: Performance >= 95, Accessibility 100, Best Practices 100, SEO 100
- [ ] LCP < 2.0 s, CLS < 0.05, INP < 200 ms, landing JS < 100 KB gzipped
- [ ] API service coverage >= 85%
- [ ] ZAP baseline scan against staging: no high findings
- [ ] Manual pass: keyboard only, VoiceOver iOS, TalkBack
- [ ] Real device check on a mid-range Android phone

### 1.9 Launch
- [ ] Domain registered and added to Vercel **(Hendrik)**
- [ ] Upgrade to Vercel Pro; restrict production promotion; audit log on
- [ ] Vercel Firewall rate-limit rules on form routes
- [ ] SPF, DKIM, DMARC (`p=none` with reporting) on sending subdomain, custom return-path
- [ ] Postmark production sender verified; real placeholder addresses replaced
- [ ] `migrate.yml` with manual approval; production auto-promotion off; promote after migrations and smoke tests
- [ ] Rollback rehearsed (Instant Rollback)
- [ ] Backup restore tested from nightly dump and Neon PITR
- [ ] Production smoke test: subscribe, confirm, unsubscribe, prayer request received by prayer inbox

**Exit gate Phase 1**
- [ ] A visitor on a mid-range phone can read the page, subscribe and confirm, and send a prayer request; the prayer team receives it
- [ ] All budgets in 1.8 met; no high security findings
- [ ] DMARC reports reviewed after 2 weeks; plan to move to `quarantine`

---

## Phase 2 - Devotionals and admin

### 2.1 Auth and RBAC
- [ ] Migrations: `users`, `roles`, `user_roles`, `sessions` (roles `admin`, `editor`, `prayer_team`)
- [ ] Passkey (WebAuthn) and/or magic-link login with mandatory second factor for admins
- [ ] Opaque session IDs in Postgres/Redis; `__Host-` cookies `HttpOnly; Secure; SameSite=Lax; Path=/`; 30 minute admin idle timeout
- [ ] Permission dependency on every admin endpoint, default deny
- [ ] Audit log writes for every view or change of prayer requests
- [ ] Tests: auth bypass attempts, role boundaries, session expiry, CSRF
- [ ] Threat model updated; ADR for final auth choices

### 2.2 Admin UI
- [ ] `(admin)` routes behind auth and feature flag
- [ ] Prayer request inbox: decrypt on view, status changes, audit trail
- [ ] Subscriber list and export (admin only)
- [ ] Contact messages view

### 2.3 Devotional content
- [ ] Migrations: `devotionals`, `series`, `scriptures`, `tags`
- [ ] Authoring UI: draft, preview, schedule, publish (sanitised, never raw HTML from users)
- [ ] Public archive and detail pages (ISR), 62ch measure, Lora body
- [ ] RSS feed, Article JSON-LD, sitemap updates
- [ ] Basic search with Postgres full-text

### 2.4 Weekly email
- [ ] Newsletter send via Postmark broadcast stream (or chosen tool) from our subscriber list
- [ ] Unsubscribe header and link in every email; send only to `active` subscribers
- [ ] Bounce and complaint webhooks update subscriber status
- [ ] Send preview to self before broadcast

**Exit gate Phase 2**
- [ ] Editor publishes a devotional and it goes out by email; prayer team reviews requests with a full audit trail
- [ ] Phase 1 quality gates still pass; ZAP and e2e extended to admin

---

## Phase 3 - Teaching series and audio

- [ ] ADR: media storage (Vercel Blob vs R2) based on bandwidth cost
- [ ] Migrations: `media_assets`; series pages
- [ ] Audio upload with signed URLs, size and type limits, malware/content-type checks
- [ ] Embedded accessible audio player (keyboard, captions/transcripts where possible)
- [ ] Podcast RSS feed validated against Apple and Spotify requirements
- [ ] PWA offline caching of recent devotionals (service worker, update strategy)
- [ ] Re-run performance budgets with audio pages

**Exit gate Phase 3**
- [ ] A series with audio plays on mobile and in a podcast app; offline devotional reading works

---

## Phase 4 - Community (only if wanted)

- [ ] Decision gate **(Hendrik)**: build any of these at all?
- [ ] Public accounts: Argon2id or passkeys only, breached-password check, lockout/backoff, email verification
- [ ] Favourites and reading plans
- [ ] Comments with moderation queue and abuse reporting
- [ ] Giving via hosted provider (Stripe Checkout); no card data touches our systems
- [ ] Privacy doc, threat model and retention rules updated before each feature ships

---

## Ongoing (every phase)

- [ ] Review Dependabot PRs weekly; keep lockfiles committed
- [ ] Test backup restore quarterly
- [ ] Rotate secrets per runbook; review access and 2FA
- [ ] Review DMARC reports; tighten policy
- [ ] ZAP baseline weekly and before releases
- [ ] Update `CLAUDE.md`, ADRs, threat model and privacy doc whenever behaviour changes

## Open questions (from CLAUDE.md section 15)

- [ ] 1. Budget and audience region
- [ ] 2. Domain name
- [ ] 3. Email provider confirmation (Postmark assumed)
- [ ] 4. Who reads prayer requests; may full text be emailed
- [ ] 5. Auth needs beyond admin
- [ ] 6. Audience jurisdictions for privacy law
- [ ] 7. Built-in admin vs headless CMS
- [ ] 8. Final colour scheme
- [ ] 9. Donations timing
- [ ] 10. GitHub account/org and repo name
