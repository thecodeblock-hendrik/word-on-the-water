# CLAUDE.md — Word on the Water

Development plan and working rules for the **Word on the Water** web application: an online Christian ministry publishing devotionals and Bible teaching for men and surfers.

> *"Who then is this, that even the wind and the sea obey him?"* — Mark 4:41 (ESV)

This file is both the project plan and the instructions for anyone (human or Claude Code) working in the repository. Read it fully before making changes. When the plan and the code disagree, fix one of them in the same pull request.

**Status (updated 2026-10-31):** Phase 0 in progress, steps 0.1 to 0.8 done (repo, ADRs, API, database, email outbox, web shell, OpenAPI types, CI and branch protection); 0.9 Vercel nearly done (projects, Neon, Upstash, env vars, protection and previews working in `fra1`; Neon preview branching open). Next: 0.10 observability and docs. Step-by-step progress lives in [PLAN.md](docs/PLAN.md); this file holds the stack, rules and decisions.

---

## 1. Goals and scope

**Goal:** a production-ready, mobile-first, secure web application whose full framework (frontend, API, database, auth scaffolding, CI/CD, observability) is in place from day one, while **Phase 1 ships only the public landing page**.

**Phase 1 user-facing features (from the mockup):**

1. Landing page sections: hero (Mark 4:41 + logo), About / who it's for, What's coming (weekly devotional, teaching series, audio) with a sample "surf report" devotional, Start here (the gospel in 4 steps), statement of faith, founder bio, footer with ESV copyright notice.
2. **Email sign-up** (first name optional, email required) with double opt-in.
3. **Prayer request / contact form** (the mockup shows `mailto:` links; we replace them with a private, spam-protected form that stores the request and notifies the prayer inbox (`prayer@wordonthewater.net`)).

**Out of scope for Phase 1** but designed for: devotional library, teaching series, audio/podcast, public user accounts, admin CMS, search, newsletter sending.

**Mobile strategy (decided, option B in [FLUTTER.md](docs/FLUTTER.md)):** the Next.js site is the mobile experience: mobile-first, fast, and installable as a PWA through `app/manifest.ts`. A native Flutter app for iOS and Android may be added later on the same FastAPI; it is revisited at the Phase 2 gate. Until then, no Flutter work and no changes to the web stack.

**Design source:** `website/landing-page-mockup.html` (published at https://claude.ai/artifact/UYYvSXJkgeofmJ8PchzgWw). The mockup is the visual reference, not production code. Its "design notes" and "Ideas for Hendrik" sections are not shipped. A PDF of the mockup is in `mockup_site.pdf`.

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
| Database | **PostgreSQL 17** | Reliable, `citext`, `pgcrypto`, full-text search for later phases |
| Cache / rate limits | **Valkey/Redis** (managed, e.g. Upstash) | Rate limiting, idempotency keys, later sessions/queues |
| Background jobs | **Outbox table drained by Vercel Cron** (plus an immediate best-effort send after the request). Phase 2+: Vercel Queues or QStash if volume needs it | Vercel has no long-running workers; email sending must not block requests and must be retryable |
| Subscriptions and newsletter | **Kit** (kit.com, API v4, API key auth) | Owns the subscriber list, double opt-in confirmation email, unsubscribe links, legal footer and broadcasts (ADR 0008). Our API forwards sign-ups and receives Kit webhooks |
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
| Scheduled jobs | **Vercel Cron** (`vercel.json` in `apps/api`) calling protected endpoints: drain email outbox (daily on Hobby, because Hobby only allows daily crons; every 5 min after the move to Pro), retention cleanup (daily). Until Pro, the immediate best-effort send after each request is what delivers email promptly |
| WAF / DDoS / rate rules | **Vercel Firewall** (managed rules, custom rate-limit rules on form routes, Attack Challenge Mode for emergencies) |
| Bot protection | Turnstile on forms (optionally plus Vercel BotID) |
| DNS | Production domain **`wordonthewater.net`** (registered; `www` redirects to the apex), with DNS hosted at **Squarespace** (Squarespace DNS records pointing the site at Vercel; nameservers are not moved to Vercel). Keep the existing MX records for the `hello@` and `prayer@` mailboxes untouched. Do not put the Cloudflare proxy in front of Vercel; it breaks caching and the firewall's view of client IPs |
| Analytics | Vercel Web Analytics + Speed Insights (cookieless, real-user Core Web Vitals) or Plausible |
| Media (Phase 3 audio) | Vercel Blob (or Cloudflare R2 if bandwidth cost matters) |
| Plan | Start on **Hobby** for Phase 0; move to **Pro** (~USD 20/month per seat) before public launch, since Hobby is for non-commercial use and Pro adds deployment protection options, more cron frequency and firewall rules |

**Serverless rules that follow from Vercel:**
- No long-running processes or in-memory state; anything stateful lives in Postgres or Redis.
- SQLAlchemy uses Neon's **pooled** endpoint with `NullPool` (let PgBouncer pool) and short timeouts; Alembic migrations use the **direct** (unpooled) URL.
- Keep API function cold starts small: lean dependencies, lazy-import heavy libraries, set `maxDuration` sensibly (10–30 s).
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
   │                 ├── Kit API (sign-ups via outbox job; Kit webhooks call back into the API)
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
├── docker-compose.yml            ← local Postgres 17, Valkey, Mailpit
├── docker/postgres/init.sql      ← extensions and local roles (app_migrator, app_runtime)
├── Makefile, pnpm-workspace.yaml, .pre-commit-config.yaml, .env.example
├── scripts/setup_env.py          ← `make setup` writes .env with random local secrets
├── db/neon_roles.sql             ← one-off least-privilege roles on Neon (see docs/runbooks/deploy.md)
├── website/landing-page-mockup.html, mockup_site.pdf   ← design reference
├── .github/
│   ├── workflows/ (ci.yml, security.yml, codeql.yml, neon-preview-cleanup.yml; migrate.yml planned)
│   ├── dependabot.yml
│   └── pull_request_template.md
├── docs/
│   ├── PLAN.md, FLUTTER.md, threat_plan.md   ← step plan, native app assessment, threat work plan
│   ├── adr/                      ← 0001 to 0007
│   ├── runbooks/                 ← deploy.md; planned: incident, restore-db, rotate-secrets
│   └── threat-model.md, privacy.md   ← planned (step 0.10)
├── apps/
│   ├── web/                      ← Next.js 16
│   │   ├── AGENTS.md             ← generated by Next: read node_modules/next/dist/docs first
│   │   ├── src/proxy.ts          ← per-request CSP nonce (Next 16 name for middleware)
│   │   ├── src/app/ (layout.tsx, page.tsx, not-found.tsx, error.tsx, api/health/route.ts)
│   │   │   └── planned: (marketing)/ privacy and subscribe pages, sitemap/robots/manifest/OG
│   │   │       image, (content)/ and (admin)/ for Phase 2
│   │   ├── src/components/layout/ (header, footer, skip-link); planned: ui/, sections/
│   │   ├── src/lib/ (api-client.ts, env.ts, csp.ts, security-headers.ts); planned: actions/, validation/
│   │   ├── src/styles/tokens.css ← design tokens from the mockup
│   │   ├── tests/ (unit/, e2e/), vitest.config.ts, playwright.config.ts
│   │   └── vercel.json           ← region, ignored builds
│   └── api/                      ← FastAPI
│       ├── pyproject.toml, uv.lock, alembic/ (env.py, versions/)
│       ├── app/
│       │   ├── main.py, openapi_export.py
│       │   ├── core/ (config, errors, logging, middleware, rate_limit, security; crypto planned)
│       │   ├── db/ (base, ids, session)
│       │   ├── models/ (subscriber, prayer_request, contact_message, email_outbox, audit_log)
│       │   ├── routers/ (health, cron, v1; planned: subscribers, prayer, contact, admin/)
│       │   ├── services/ (email_templates, outbox)
│       │   ├── integrations/email/ (base, console, smtp, postmark, factory); turnstile planned
│       │   ├── integrations/kit/ ← planned: Kit v4 client, webhook signature check
│       │   ├── jobs/ (drain_outbox; retention planned)
│       │   └── schemas/          ← planned (Pydantic models, added with the first endpoints)
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
- **Design tokens** (`tokens.css`) carry the mockup's variables: `--bg --surface --ink --muted --line --accent --accent-ink --deep --on-deep --on-deep-muted --accent-on-deep`. Default scheme is navy/teal/sand; dark mode via `prefers-color-scheme` plus a user toggle stored in a cookie (so SSR renders the right theme with no flash). The final colour scheme is still to be chosen; only tokens change when it is.
- **Fonts:** Barlow Condensed (display), Barlow (UI), Lora (devotional body). Self-host via `next/font` (no Google Fonts request, better privacy and performance), `display: swap`, subset to Latin.
- Readable measure `62ch` for devotional text; base font size ≥ 16px (prevents iOS zoom on inputs); line-height 1.5–1.7.
- **Touch targets ≥ 44×44px**, spacing ≥ 8px between targets. Mobile navigation: sticky header with a single primary CTA ("Get the devotional") and an accessible menu (Radix Dialog/Sheet) replacing the hidden desktop nav.
- Respect `prefers-reduced-motion`; respect safe-area insets (`env(safe-area-inset-*)`) for notched phones.
- Images: `next/image`, AVIF/WebP, explicit sizes, lazy below the fold. Logo as inline SVG using `--logo-ring`/`--logo-wave` tokens as in the mockup.
- Forms on mobile: correct `type`/`inputmode`/`autocomplete` (`email`, `given-name`), visible labels (not placeholder-only — fix from mockup), inline errors announced via `aria-live`.
- **Installable PWA (Phase 1):** the site must feel like an app on a phone. Read `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` and `.../03-file-conventions/01-metadata/manifest.md` first.
  - `app/manifest.ts` returning `MetadataRoute.Manifest`: `name`, `short_name`, `description`, `id`, `start_url` and `scope` `/`, `display: "standalone"`, `orientation: "portrait"`, `lang`, `categories`, `background_color` and `theme_color` from the tokens, `shortcuts` (Start here, Prayer request) and narrow `screenshots`.
  - Icons: 192 and 512 px PNG, a 512 px maskable icon (logo inside the safe zone), `app/icon.svg`, and `app/apple-icon.png` (180 px) for iOS.
  - `export const viewport` with `themeColor` per colour scheme (light and dark media queries) and `viewport-fit=cover`; `metadata.appleWebApp` for the iOS home-screen launch.
  - When the colour scheme changes, the manifest, theme colours and icons change with it (only tokens should drive them).
  - Offline reading (service worker) and Web Push are Phase 2 and 3 decisions, not Phase 1.

### Performance budgets (enforced in CI with Lighthouse CI on a mobile profile)

| Metric | Budget |
|---|---|
| LCP (mobile, 4G) | < 2.0 s |
| CLS | < 0.05 |
| INP | < 200 ms |
| JS shipped on landing page | < 100 KB gzipped |
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
- Secrets live in **Vercel Environment Variables** marked *Sensitive*, scoped separately for Development, Preview and Production (preview never gets production keys for our own secrets; the Neon and Upstash credentials are an exception until gaps R-1 to R-3 in `docs/threat-model.md` are closed, before real data exists), plus GitHub Environments for CI-only secrets. Local runs use the root `.env` from `make setup`. Never in the repo or in client bundles. `.env.example` lists names only. **gitleaks** in pre-commit and CI.
- `KIT_API_KEY` and `KIT_WEBHOOK_SECRET` are Sensitive Vercel variables on the API project only, with the Production key never in Preview or Development (use a separate Kit test form or account there). Kit allows 120 requests per minute per API key.
- Separate DB roles: `app_migrator` (DDL, used only by migrations) and `app_runtime` (DML on app tables only).

### 6.7 Supply chain and code security

- Lockfiles committed; `pnpm install --frozen-lockfile`, `uv sync --locked`.
- Dependabot (weekly, grouped), `pnpm audit` and `pip-audit` in CI, **CodeQL** for TS and Python, **Bandit** + **Ruff** security rules, **OSV-Scanner** across both lockfiles.
- Pin GitHub Actions to commit SHAs; least-privilege `permissions:` in workflows. Use a scoped Vercel token stored as a GitHub Environment secret only where CI must call Vercel; prefer Vercel OIDC federation for any cloud access from functions.
- Vercel: enable Deployment Protection on preview deployments, restrict who can promote to production, turn on 2FA for every team member, enable the Vercel audit log on Pro.
- Branch protection on `main`: PR required, checks green, 1 review, no force-push, signed commits recommended.
- Keep production dependencies separate from dev dependencies (`uv` groups, `devDependencies`) so test tooling never ships in a function bundle.

### 6.8 Logging, monitoring, incident response

- Structured JSON logs (`structlog` in API) with request IDs; **never log request bodies, emails, or prayer text**. Sentry `before_send` scrubs PII; `sendDefaultPii: false`.
- Alerts: error-rate spike, 5xx, failed email sends, DB connection failures, certificate expiry, uptime check (e.g. Better Stack/UptimeRobot on `/api/health`), Vercel Log Drains to a log store (e.g. Better Stack or Axiom) since Vercel's built-in log retention is short.
- `SECURITY.md` with a contact address (`hello@wordonthewater.net` until a dedicated `security@` alias exists); `/.well-known/security.txt` with the same `Contact:` and a `Canonical:` of `https://wordonthewater.net/.well-known/security.txt`.
- `docs/runbooks/incident.md`: contain, assess, notify (data-breach notification duties under GDPR/POPIA), fix, review.

### 6.9 Backups and data retention

- Neon point-in-time recovery (≥ 7 days on the paid plan) plus a nightly `pg_dump` from a GitHub Actions schedule to separate storage (e.g. encrypted in Vercel Blob or S3); **restore tested quarterly** (runbook).
- Retention (proposed): unconfirmed subscribers deleted after 7 days; prayer requests deleted (or anonymised) after 90 days; contact messages after 12 months; audit logs 1 year. Enforced by a daily Vercel Cron job.

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
  -- status is updated from Kit webhooks (activated, unsubscribed, bounced, complained)
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
| POST | `/v1/webhooks/kit` | Kit webhook receiver: signature verified, updates subscriber status (no service token; the signature is the auth) |
| POST | `/v1/prayer-requests` | Submit a prayer request (202) |
| POST | `/v1/contact` | Submit a general message (202) |

Settings via `pydantic-settings`, failing fast at startup if required secrets are missing. Blank environment values count as unset.

**Implemented so far:** `GET /health/live`, `GET /health/ready` (database and Redis), `GET /v1/ping` (service token required; stands in for the default-deny `/v1` router) and `GET /cron/drain-outbox` (`CRON_SECRET`). None of the Phase 1 endpoints in the table above exist yet; they arrive in steps 1.3 to 1.5.

---

## 9. Frontend conventions (Next.js)

- Server Components by default; `"use client"` only for interactive islands (forms, menu, theme toggle).
- Pages render **per request** (required by the nonce-based CSP, see ADR 0007); static assets are still CDN-cached. Forms post via Server Actions with progressive enhancement (they work before JS hydrates).
- `src/lib/env.ts` validates env vars with Zod at build/start.
- SEO: `generateMetadata`, Open Graph image, `sitemap.ts`, `robots.ts`, JSON-LD (`Organization`, later `Article` for devotionals), canonical URLs.
- PWA: `app/manifest.ts`, icons and `viewport.themeColor` are part of the shell and are tested (manifest unit test, e2e that the manifest and icons load under the CSP). See section 5.
- Feature flags (simple env-based to start) gate Phase 2 routes so the framework exists but isn't public.
- Content in Phase 1 lives in typed TS/MDX files in the repo. Phase 2 decides between DB-backed content with an admin UI (default plan) or a headless CMS (see §15).
- **Scripture copyright:** ESV quotations follow Crossway's permissions (quote limits and the required copyright notice in the footer). Keep scripture references structured (`book`, `chapter`, `verse`) so translations can be swapped.

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
| Security | ZAP baseline scan against staging (weekly + pre-release) | No high findings |

Rule: write tests first (red, green, refactor) for all logic; a bug fix comes with a test that fails before the fix. `docs/PLAN.md` has the full testing approach and definition of done.

---

## 11. Environments and CI/CD

Environments: **local** (Docker Compose for data services, Mailpit catches email, Turnstile test keys) → **preview** (Vercel preview deployment of web and API for every PR, each with its own Neon database branch via the Neon–Vercel integration) → **staging** (a custom Vercel environment on Pro, or a long-lived `staging` branch with its own domain) → **production**.

Deployment is done by **Vercel's Git integration**; GitHub Actions does not build or upload the app. Monorepo settings: each Vercel project has its Root Directory set and an "Ignored Build Step" (`npx turbo-ignore` or a `git diff` check) so a docs-only change doesn't redeploy both apps.

`ci.yml` on every PR and push to `main`: **API** (ruff, format check, mypy, migrations, pytest with an 85% coverage gate on `services/`, against Postgres, Valkey and Mailpit service containers), **Web** (eslint, prettier, tsc, Vitest, build), **types** (`make types-check` fails if the generated API types are stale) and **e2e** (Playwright on iPhone SE/13, Pixel 7, desktop Chromium/WebKit/Firefox). `security.yml` runs gitleaks, pip-audit, Bandit, pnpm audit and OSV-Scanner (also weekly). `codeql.yml` covers TypeScript and Python. `neon-preview-cleanup.yml` deletes a PR's Neon preview branch when the PR closes (Free plan limit of 10 branches). Planned: Lighthouse CI, axe and ZAP (step 1.8). All actions are pinned to commit SHAs and workflows default to read-only permissions.

**Branch protection on `main`:** pull request required, 10 required checks, 1 approving review, no force-push or deletion, linear history, conversations resolved. Admins are not enforced, so the owner merges with `gh pr merge --admin` once checks are green (a solo owner cannot approve their own PR).

`migrate.yml` on merge to `main`: run Alembic migrations against production with the direct (unpooled) `app_migrator` URL, gated by a **manual approval** GitHub Environment, *before* Vercel promotes the new production deployment (production auto-promotion is turned off; promotion happens after migrations succeed and smoke tests pass against the staged deployment). Preview branches run migrations on their own Neon branch in the Vercel build step. Rollback is Vercel **Instant Rollback** to the previous deployment. Migrations must be backward compatible (expand → migrate → contract) so a rollback of app code is always safe.

Conventional Commits; small PRs; every PR uses the template (what, why, screenshots on mobile, security considerations, tests).

---

## 12. Email

Two systems, split by purpose:

| Kind | System | Mail |
|---|---|---|
| Subscriber-facing | **Kit** | Double opt-in confirmation, welcome, weekly devotional broadcasts. Kit adds the unsubscribe link and legal address |
| Transactional | **Postmark** via `EmailProvider` and the outbox | Prayer-team notification, contact notification, prayer-request received (to requester, optional) |

- **Kit integration:** API v4 at `https://api.kit.com/v4`, `X-Kit-Api-Key` header (an API key is right for automating our own account; OAuth is only needed for multi-account apps and bulk endpoints). Sign-up: create subscriber (`POST /subscribers`, an upsert), then add to the double opt-in form; unsubscribe: `POST /subscribers/{id}/unsubscribe`. Webhooks via `POST /webhook_endpoints` with events `subscriber.activated`, `subscriber.unsubscribed`, `subscriber.bounced`, `subscriber.complained`. Broadcasts (Phase 2): `POST /broadcasts` as a draft, then scheduled with `send_at`. Details and open points are in ADR 0008.
- **Kit is the list's source of truth.** Our `subscribers` table is a mirror for status, consent evidence and retention. If the two disagree, Kit wins.
- Kit failures never lose a sign-up: the call runs from the outbox with retries.
- **Domain and addresses.** The domain is `wordonthewater.net`. Two mailboxes are registered:

  | Address | Used for |
  |---|---|
  | `hello@wordonthewater.net` | Public contact address; `From` and `Reply-To` of all outgoing mail (Kit newsletters and confirmation, Postmark transactional); recipient of contact-form notifications; security reports until a `security@` alias exists |
  | `prayer@wordonthewater.net` | Public prayer address on the page; recipient of prayer-request notifications from Postmark; reply address for prayer follow-ups |

  The addresses live in configuration, not code: `EMAIL_FROM` (`Word on the Water <hello@wordonthewater.net>`), plus the notification recipients `PRAYER_INBOX` and `CONTACT_INBOX`, set per environment. Preview and local runs never use the real addresses (Mailpit locally, test inboxes in Preview).

  **Both addresses are Squarespace email forwards to Hendrik's own mailbox; there is no hosted mailbox.** Consequences: nothing sends mail as these addresses except Kit and Postmark, so no mailbox provider belongs in SPF; forwarded mail can fail SPF or DMARC at the final mailbox, so delivery of notifications is tested end to end (step 1.9) and, if forwarding proves unreliable, `PRAYER_INBOX` and `CONTACT_INBOX` point straight at the destination mailbox while the public addresses stay `hello@` and `prayer@`; replying as `hello@` or `prayer@` needs "send mail as" set up in the receiving mailbox, otherwise replies come from the personal address.
- Domain authentication before launch, on the root domain because the `From` addresses are on it: **SPF** (one record that includes Postmark and Kit; keep anything Squarespace's email forwarding already put in the existing record and edit it, never add a second), **DKIM** for each sender, **DMARC** at `_dmarc.wordonthewater.net` (start `p=none` with reporting to `hello@wordonthewater.net`, move to `quarantine`), a custom return-path per sender, and Kit's own sending-domain setup. Only one SPF record may exist; merge the includes.
- Transactional templates: plain-text part always included; mobile-friendly HTML.
- Every newsletter has a working one-click unsubscribe and the physical/contact details required by law (Kit supplies both; verify in a test send).
- Tests mock Kit with a fake server and never call real Kit; Preview and Development use a separate Kit test form or account.

---

## 13. Delivery phases

Progress is tracked step by step in [PLAN.md](docs/PLAN.md); this section only describes scope.

| Phase | Status |
|---|---|
| 0 Foundations | In progress: 0.1 to 0.8 done, 0.9 nearly done; 0.10 observability and docs remains |
| 1 Landing page | Not started |
| 2 Devotionals and admin | Not started |
| 3 Teaching series and audio | Not started |
| 4 Community | Not started (decision gate) |

### Phase 0 — Foundations (framework in place, nothing public yet)
Monorepo, local Docker services, Makefile and env setup; Vercel team, two projects, Neon and Upstash, scoped env vars; Next.js shell with tokens, fonts, security headers and CSP; FastAPI app factory with settings, logging, request IDs, errors, health, service-token auth and rate limiter; SQLAlchemy and Alembic with DB roles and the first migration; email provider interface with outbox worker; OpenAPI to TypeScript types; CI, CodeQL, Dependabot, branch protection and pre-commit hooks; staging, Sentry, uptime monitoring, analytics and log drain; ADRs, threat model v1 and privacy doc v1.

### Phase 1 — Landing page (first public release)
All mockup sections as responsive mobile-first components; final colour scheme with light and dark; email sign-up through Kit with double opt-in (Kit hosts confirm and unsubscribe), plus the Kit webhook mirror; prayer request form (encrypted storage, team notification, optional reply) and contact form; privacy policy, ESV copyright notice and `security.txt`; SEO metadata, OG image, sitemap and manifest; retention job; full test suite with Lighthouse and axe budgets met and ZAP baseline clean; Vercel Pro, domain, Firewall rules, SPF/DKIM/DMARC, production deploy and a tested backup restore.
- **Exit criteria:** a visitor on a mid-range phone can read the page, subscribe and confirm, and send a prayer request; the prayer team receives it; no high security findings.

### Phase 2 — Devotionals and admin
Admin login (passkey/magic link + 2FA), RBAC, admin UI for prayer requests (with audit log), devotional authoring and publishing, devotional archive and detail pages (ISR), weekly email as Kit broadcasts created from published devotionals, RSS feed, basic search (Postgres full-text). Decision gate: revisit the native Flutter app ([FLUTTER.md](docs/FLUTTER.md), option B) and Web Push for the weekly devotional.

### Phase 3 — Teaching series and audio
Series pages, audio upload to Vercel Blob (or R2) with signed URLs, podcast RSS feed, embedded player, offline-friendly PWA caching of recent devotionals. If the Phase 2 gate chose it, the Flutter app for iOS and Android is built here.

### Phase 4 — Community (only if wanted)
Optional public accounts (save favourites, reading plans), comments with moderation, giving/donations via a hosted provider (Stripe Checkout; never handle card data ourselves).

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
- Dependabot npm PRs do not update the root `pnpm-lock.yaml`: check out the PR, run `pnpm install`, commit the lockfile and push before merging (see PLAN.md 0.8).
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
```

Local runs read the root `.env` written by `make setup` (Vercel Development has no variables, so there is nothing to pull). Run the apps with `uv run uvicorn app.main:app` in `apps/api` and `pnpm dev` in `apps/web`. Playwright's Firefox does not launch on the current macOS beta; CI covers it.

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
| 8 | Which colour scheme from the mockup? | Navy/teal/sand default (applied to the tokens; final choice still open) |
| 9 | Will there be donations/giving? | Not before Phase 4; hosted checkout only |
| 10 | Where should the repository live (GitHub account/org, name)? | **Resolved:** public repo `thecodeblock-hendrik/word-on-the-water`, no license |

### Decisions made during the build

- **Domain and mailboxes (2026-10-31):** production domain `wordonthewater.net`; `hello@` (public contact, all outgoing mail, contact notifications) and `prayer@` (prayer notifications). Mail is authenticated on the root domain, not a `mail.` subdomain, because the `From` addresses are on the root. DNS stays at Squarespace; all records (Vercel, SPF, DKIM, DMARC, return-paths) are added there.
- **Kit for subscriptions and newsletters (2026-10-31):** Kit owns the list, double opt-in, unsubscribe and broadcasts; we keep a mirror table and verify Kit webhooks. Kit has no transactional send API, so Postmark stays for prayer and contact notifications. This replaces our own token-based confirm and unsubscribe endpoints and the Postmark broadcast idea (ADR 0008, written with the 1.3 spike).
- **Database:** stay with Neon, not Supabase: native Vercel integration, a database branch per preview, and scale to zero on the free tier. Supabase would add an auto-generated REST API to lock down (ADR 0002).
- **CSP:** nonce-based, so pages render per request. A hash-based CSP with static pages was tried first and failed in a real browser (8 inline hydration scripts blocked). Re-measure LCP on a preview deployment (ADR 0007).
- **Licensing and visibility:** no license (all rights reserved); repository public.
- **Testing:** test-first for all logic, with a definition of done per step (`docs/PLAN.md`).
- **Branch protection:** the owner is not enforced, so a solo developer can merge once checks are green.
- **Mobile strategy:** option B in `docs/FLUTTER.md`. The Next.js site stays the public, SEO-friendly mobile experience and becomes an installable PWA (`app/manifest.ts`) in Phase 1. A Flutter app for iOS and Android, on the same Vercel, Neon and FastAPI, is revisited at the Phase 2 gate. Replacing Next.js with Flutter web was rejected: it cannot meet the SEO, first-load and accessibility budgets for the landing page.
