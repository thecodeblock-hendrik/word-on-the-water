# PLAN.md - Word on the Water

Step-by-step build plan derived from `CLAUDE.md`. Tick boxes as work completes. When this plan and `CLAUDE.md` disagree, fix one of them in the same change.

## How to use this plan

- Work top to bottom. Do not start a phase until the previous phase's **Exit gate** is ticked.
- Each step is small. Validate it (run it, test it, look at it) before ticking.
- Bugs: reproduce, prove the root cause, then fix, with a test that failed before the fix.
- Before adding a dependency or using an API, check the current docs and use the latest stable version.
- Security items are part of each phase, not a separate phase at the end.
- Anything that changes the stack, data model or security posture needs an ADR first.

- **Workflow:** one branch and one PR per sub-step (for example `feat/0.9-vercel`), Conventional Commits, one commit per logical chunk, push once per sub-step. Merge with `gh pr merge --squash --admin` only when every check is green. Stage named files, never a blanket `git add -A`.

Legend: `[ ]` todo, `[x]` done. **(Hendrik)** marks a decision or action needed from the owner.

---

## Status (updated 2026-11-07)

| Phase | Status |
|---|---|
| 0 Foundations | Exit gate passed 2026-11-01; open carry-overs: Neon preview branching toggle, web coverage in CI. Done: 0.1 repo and tooling, 0.2 ADRs, 0.3 API skeleton, 0.4 database, 0.5 email and outbox, 0.6 web skeleton, 0.7 OpenAPI types, 0.8 CI and branch protection; 0.9 Vercel and external services nearly done (Neon preview branching open). 0.10 observability and docs, exit gate |
| 1 Landing page | In progress. 1.1 design system and layout done (PR #59); 1.2 page sections done with real copy (PRs #60, #66; only two social-handle placeholders remain); the devotional page, series and landing card are built from repo content (PRs #64, #65, step 1.2b; three Advent devotionals). A Bible reader (BSB and WEB) is built ahead of the plan behind `BIBLE_ENABLED` (see "Bible reader" below). Next: 1.3 sign-up. The contact section (`#contact`, linked from the header and footer) arrives with 1.4 and 1.5 |
| 2 Devotionals and admin | Not started |
| 3 Teaching series and audio | Not started |
| 4 Community | Not started (decision gate) |

**Where the code stands:** API with health, readiness, cron drain and a default-deny `/v1` router; five database tables with a reviewed migration; email providers (Postmark, SMTP, console), templates and a retrying outbox; Next.js site with tokens, fonts, nonce CSP, security headers, the landing page (hero, about, what's coming, start here, beliefs, writer, footer with the ESV notice), a header with the theme toggle and mobile menu, and devotional pages and a series list built from markdown in `apps/web/content` (three Advent devotionals so far, credited to "H"); generated TypeScript API types; CI with e2e on six browsers; branch protection on `main`. A Bible reader for the BSB and WEB (public-domain text in `apps/web/content/bibles`) with a columns picker on desktop, a tabbed sheet on phones, previous and next chapter and a remembered version, behind `BIBLE_ENABLED=1` (the ESV waits for Crossway's approval). Not built yet: sign-up, prayer and contact forms, privacy page, SEO and manifest (the PWA steps are in [PWA_checklist.md](PWA_checklist.md)).

**Decisions made so far:** mobile strategy is option B long term (Next.js website as an installable PWA now; a Flutter app for iOS and Android revisited at the Phase 2 gate, see `docs/FLUTTER.md`); Neon over Supabase (ADR 0002); nonce CSP with per-request rendering, hash-based option rejected after a browser test (ADR 0007); no license and a public repo; the site is free with no donations, so the ESV is used under Crossway's free non-commercial terms; Phase 1 devotionals live in the repo as markdown; the Bible reader ships public-domain BSB and WEB from the repo and the ESV from the API later; Dawn patrol (light) and Night swell (dark) colour schemes; test-first for all logic; branch protection with the owner not enforced.

**Waiting on Hendrik:** Neon preview branching toggle (step 0.9), social handles for the footer, a pastor or elder reading "Start here", prayer-notification default.

---

## Testing approach (applies to every step)

Tests are written first for all logic. The order of items in this plan is not the order of work: where a step lists "Tests", write them before the code.

**Red, green, refactor**
1. Write a test for the next small behaviour. Run it and confirm it fails for the expected reason (not an import or typo error).
2. Write the minimum code to pass. Run it and confirm it passes.
3. Refactor with the tests green. Commit.

**Definition of done for every step** (all must hold before a box is ticked)
- [ ] New behaviour has tests that failed before the code existed
- [ ] The full suite passes locally (`make test`), plus `make lint` and `make typecheck`
- [ ] Negative and security cases are covered, not just the happy path: invalid input, missing or wrong auth, rate limits, expired or replayed tokens, no-leak assertions for personal data
- [ ] Anything touching the database or Redis is tested against the real local services, not mocks. Mock only external third parties (Postmark, Kit, Turnstile)
- [ ] Tests are deterministic: no sleeps, no real clock (inject or freeze time), no order dependence, no shared state between tests
- [ ] A bug fix starts with a test that reproduces it and fails
- [ ] The step's result is checked in the running system (curl, Mailpit, browser at 375px), not only by unit tests

**What counts as test-first, by layer**
- API services, validators, crypto, tokens, rate limiting, retention: strict TDD with pytest
- API endpoints: integration tests through the HTTP client against real Postgres and Redis
- Web components and forms: Vitest + Testing Library, test first for behaviour (validation messages, focus, aria-live)
- Config, infrastructure, layout and styling: no TDD; use a verification step instead (CI run, header check with `curl -I`, screenshot at 375px, axe, Lighthouse)
- End to end: Playwright journeys written when the feature's pieces exist, before the step is ticked

**Test pyramid and gates (enforced in CI from step 0.8)**
- Many unit tests, fewer integration tests, a small set of e2e journeys
- Coverage: at least 85 percent on `services/`, with the threshold failing the build
- Zero serious or critical axe violations; Lighthouse budgets in section 5 of `CLAUDE.md`
- Security scans (gitleaks, pip-audit, pnpm audit, OSV-Scanner, Bandit, CodeQL, ZAP) block merges on high findings

**Review**
- Each PR description lists the tests added and states which behaviours they prove
- Flaky tests are fixed or removed immediately, never retried into passing

---

## Phase 0 - Foundations (nothing public)

### 0.1 Repository and tooling
- [x] `git init`, `.gitignore` (node, python, env files, `.vercel`, build output), `.gitattributes`
- [x] Create GitHub repo `word-on-the-water` (private, thecodeblock-hendrik)
- [x] Monorepo skeleton: `apps/web`, `apps/api`, `packages/api-types`, `docs/{adr,runbooks}`, `.github`
- [x] `README.md` (concise quick start), `SECURITY.md`
- [x] `LICENSE` decision: none, all rights reserved (repo is public)
- [x] `.editorconfig`, `.env.example` (names only, no values)
- [x] `docker-compose.yml`: Postgres 18 (with `citext`, `pgcrypto`), Redis/Valkey, Mailpit
- [x] Validate: `docker compose up` brings all three healthy; connect with `psql`, `redis-cli`; Mailpit UI loads
- [x] `Makefile` base targets: `setup up down logs`; `make setup` generates a working local `.env` with random secrets (`scripts/setup_env.py`)
- [x] Pre-commit hooks: gitleaks, file hygiene, Conventional Commits
- [x] Validate: committing a fake secret is blocked

### 0.2 Decision records
- [x] ADR 0001 BFF (browser never calls FastAPI)
- [x] ADR 0002 PostgreSQL via Neon
- [x] ADR 0003 Auth approach (no login in Phase 1; admin passkey/magic link + 2FA in Phase 2)
- [x] ADR 0004 Email provider interface + Postmark
- [x] ADR 0005 Hosting on Vercel (two projects, Marketplace data services)
- [x] ADR 0006 Application-layer encryption of prayer requests
- [ ] ADR 0008 Kit for subscriptions and newsletters (written with the 1.3 spike; narrows ADR 0004 to transactional email only)

### 0.3 API skeleton (`apps/api`)
- [x] `uv init`, Python 3.13, `pyproject.toml` with separate `dev` group (pytest, ruff, mypy, bandit, pip-audit)
- [x] Add runtime deps (latest): fastapi, uvicorn, pydantic, pydantic-settings, sqlalchemy[asyncio], asyncpg, alembic, structlog, cryptography, httpx, redis client
- [x] `app/core/config.py`: `pydantic-settings`, fail fast on missing secrets
- [x] `app/main.py`: app factory, router registration, `/docs` and `/openapi.json` disabled in production
- [x] `app/core/logging.py`: structlog JSON, request ID middleware, never log bodies
- [x] Error handlers returning `{ "error": { "code", "message" } }`, no stack traces
- [x] Security middleware: `Cache-Control: no-store`, body size limit
- [ ] Strict `Content-Type` check (added with the first POST route in 1.3)
- [x] `routers/health.py`: `/health/live`
- [x] `/health/ready` (DB + Redis)
- [x] `core/security.py`: service-token dependency (constant-time compare), default deny on non-health routes
- [x] `core/rate_limit.py`: Redis sliding window keyed by hashed IP and email; generic 429
- [x] Client IP taken only from Vercel-set headers
- [x] Tests: health, auth rejected without token, rate limit trips, error shape
- [x] Pre-commit hook for ruff; Makefile targets `lint`, `typecheck`, `test` cover the API (`migrate` added in 0.4)
- [x] Validate: `uv run pytest`, `uv run ruff check`, `uv run mypy --strict` all green

### 0.4 Database
- [x] `db/session.py`: async engine, `NullPool`, short timeouts, TLS
- [x] `db/base.py`: declarative base, UUID v7 id mixin, `created_at/updated_at` (UTC)
- [x] Alembic configured to use the direct (unpooled) URL
- [x] Models: `subscribers`, `prayer_requests`, `contact_messages`, `email_outbox`, `audit_log` (per CLAUDE.md section 7)
- [x] First migration generated, reviewed by hand, applied locally
- [x] DB roles: `app_migrator` (DDL) and `app_runtime` (DML only); runtime role cannot alter schema
- [x] Validate: migrate up, down, up again on a clean database; runtime role denied DDL

### 0.5 Email and outbox
- [x] `EmailProvider` interface in `integrations/email/`
- [x] Console and Mailpit (SMTP) implementations; Postmark implementation
- [x] Template renderer (plain text always, mobile-friendly HTML)
- [x] Outbox service: enqueue in same transaction as the business write
- [x] `jobs/drain_outbox.py`: lock rows, send, retry with backoff, mark failed after N attempts
- [x] Cron endpoint protected by `Authorization: Bearer $CRON_SECRET`
- [x] Tests: enqueue, drain success, drain failure and retry, cron auth
- [x] Validate: enqueued email appears in Mailpit

### 0.6 Web skeleton (`apps/web`)
- [x] Create Next.js (latest stable, App Router, TypeScript strict), pnpm
- [x] Tailwind CSS v4 with `src/styles/tokens.css` (mockup tokens; replaced by Dawn patrol and Night swell in step 1.1)
- [x] Fonts via `next/font`: Barlow Condensed, Barlow, Lora (self-hosted, Latin, `display: swap`)
- [x] Root layout, skip link, header, footer, `not-found.tsx`, `error.tsx`
- [x] Static security headers (HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP) in `next.config.ts`; `X-Powered-By` removed
- [x] Content-Security-Policy in `proxy.ts` (Next 16 renamed `middleware.ts`): nonce-based, pages render per request (ADR 0007); report-only mode via `CSP_REPORT_ONLY=1`
- [x] ADR 0007 CSP approach (hash-based option tried and rejected: browser blocked 8 inline hydration scripts)
- [x] `src/lib/env.ts`: Zod validation; `server-only` on every secret-touching module
- [x] `src/lib/api-client.ts`: server-side calls with service token and forwarded client IP
- [x] `api/health/route.ts`
- [x] ESLint, Prettier, Vitest + Testing Library, Playwright configured
- [x] Pre-commit hooks for prettier and eslint; Makefile targets `lint`, `typecheck`, `test`, `e2e` extended to cover the web app
- [x] Validate: `pnpm dev` renders shell at 375px; response headers verified with `curl -I`

### 0.7 OpenAPI types pipeline
- [x] Script exports OpenAPI from FastAPI to a file
- [x] `openapi-typescript` generates `packages/api-types`
- [x] `make types` works; `make types-check` fails if generated types are stale (also guarded by a pytest)
- [x] CI runs `make types-check` (added with `ci.yml` in 0.8)
- [x] Makefile `types` and `types-check` targets

### 0.8 CI and repo protection
- [x] `ci.yml`: frozen installs, lint, type-check, unit tests, integration tests (service containers), build
- [x] Coverage gate in CI: `services/` at least 85 percent (`pytest-cov`)
- [ ] Web coverage reported in CI (Vitest coverage; add once there is logic worth measuring)
- [x] `codeql.yml` (TypeScript, Python)
- [x] `security.yml`: gitleaks, pip-audit, pnpm audit, OSV-Scanner, Bandit
- [x] Actions pinned to commit SHAs; least-privilege `permissions:`
- [x] `dependabot.yml` (weekly, grouped)
- [x] First Dependabot run: docker-compose (PR #12, Valkey 8 to 9) and npm for `apps/web` (PR #13, 5 updates) opened PRs; github-actions and uv ran with nothing to update
- [x] Dependabot npm PRs change `package.json` without the root `pnpm-lock.yaml`. Pointing Dependabot at the root does not work here (a root `package.json` breaks either Vercel or Dependabot alerts, #19), so the lockfile is regenerated by hand on each such PR (rule in `CLAUDE.md` section 14). #12 and #13 merged
- [x] PR template (what, why, mobile screenshots, security considerations, tests)
- [x] Branch protection on `main`: PR required, 10 required checks, 1 review, no force-push or deletion, linear history, conversations resolved. Admins are not enforced so the owner can merge their own PRs with `gh pr merge --admin`
- [x] Validate: a test PR runs every workflow green (PR #10, all 11 checks, six Playwright browser projects)

### 0.9 Vercel and external services
- [x] Vercel team with 2FA for all members (team `thecodeblock`, Hobby)
- [x] Projects `wotw-web` (root `apps/web`) and `wotw-api` (root `apps/api`) linked to GitHub
- [x] Ignored Build Step per project so docs-only changes do not redeploy (diff against `VERCEL_GIT_PREVIOUS_SHA`; the API always builds previews so each web preview has an API to call)
- [x] Region chosen and pinned for both projects and the database: `fra1` (Neon `aws-eu-central-1`)
- [ ] Neon (Marketplace): pooled and direct URLs done (`NEON_*` prefix); **branch per preview still off** (Neon connection has no deployment actions, so previews use the main branch) **(Hendrik: enable in the store settings)**
- [x] `db/neon_roles.sql` creating `app_migrator` (owns the schema, DDL) and `app_runtime` (DML only) with the same default-privilege grants as `docker/postgres/init.sql`, generated passwords, documented in `docs/runbooks/deploy.md`; run once on Neon. Runtime uses the pooled URL, migrator the direct URL
- [x] Upstash Redis (Marketplace, `UPSTASH_*` prefix; `REDIS_URL` falls back to `UPSTASH_REDIS_URL`)
- [x] Env vars set per scope (Preview and Production; Development left empty for our variables), secrets marked Sensitive, preview never gets production keys. Exceptions: the integration-managed `NEON_*`/`UPSTASH_*` variables are not Sensitive and include Development, and preview shares Redis and the role passwords with production (one Upstash database, Neon branches copy roles)
- [x] `apps/api/vercel.json`: Python runtime, region, `maxDuration`, crons (outbox daily on Hobby, `*/5` on Pro; retention cron added with the retention job in Phase 1)
- [x] `apps/web/vercel.json`: region (security headers stay in `next.config.ts` so there is one source)
- [x] Deployment Protection on previews; API only reachable by web (bypass secret) and Cron
- [x] Makefile `env` target (`vercel env pull`); removed in the code review fixes because Development has no variables and the API reads only the root `.env`
- [x] Validate: preview deploy of both apps; web health route reaches API health through the BFF (`/api/health` on the web preview returns ok after the API checks Neon and Upstash, served from `fra1`)
- [x] Production: migrations run on Neon main as `app_migrator` (head `45f20f111f39`, tables owned by `app_migrator`, `app_runtime` denied DDL), then merged to deploy production
- [x] Neon preview branches deleted when a PR closes (`neon-preview-cleanup.yml`, verified on #25): the Free plan allows 10 and previews failed with "Resource provisioning failed" once it was reached

### 0.10 Observability and docs
- [x] Sentry in web (server side) and API with PII collection off and `before_send` scrubbing; live preview test showed both events scrubbed (`docs/archive/sentry_checklist.md`)
- [x] Vercel Web Analytics and Speed Insights (verified on production: both scripts 200, page view recorded, no console errors)
- [x] Uptime monitor on `/api/health` and the home page (UptimeRobot free plan)
- [x] Staging environment: deferred to 1.9 (needs Vercel Pro); previews cover testing until then
- [x] `docs/threat-model.md` v1 (STRIDE): 32 threats with status, and four known gaps (R-1 to R-4)
- [x] Isolate preview from production data and credentials (threat model R-1 to R-3) before step 1.3: previews branch from a data-free Neon base or stop branching, previews get their own database roles and passwords, and preview gets its own Upstash database or a key prefix **(Hendrik for the Neon and Upstash dashboards)**
- [x] `docs/privacy.md` v1 (data inventory, retention, lawful basis, processors, rights); five decisions for Hendrik listed at its end (controller and address, regulator, dump retention, Upstash region and mailbox provider, data processing agreements)
- [x] Runbooks: `deploy.md`, `incident.md`, `restore-db.md`, `rotate-secrets.md` (the restore runbook has not been rehearsed; the first drill is step 1.9)
- [x] Nightly `pg_dump` workflow to separate encrypted storage: `backup.yml` dumps Neon `main` as `app_backup`, encrypts with age, uploads to Cloudflare R2 (`wotw-db-backups`, WEUR, 30 day lifecycle); script tested in CI. Manual runs succeed (2026-11-01) and route 2 of `docs/runbooks/restore-db.md` was rehearsed the same day (drill log). The first scheduled 01:23 UTC run succeeded

**Exit gate Phase 0** (checked 2026-11-01)
- [x] Fresh clone to running app using only `make setup && make up`: a clean clone starts Postgres 18, Valkey and Mailpit healthy. To run the apps it also needs `pnpm install --frozen-lockfile`, `uv sync --locked` and `make migrate`, once. Test in an empty environment: a shell that already exports `DATABASE_URL`, `SERVICE_TOKEN` and the like silently overrides `.env`
- [x] CI green on `main` (CI, Security and CodeQL on `72c832c`); preview deploys for both projects pass on every PR
- [x] Health checks pass end to end through the BFF. Locally `/api/health` returns ok via the API's `/health/ready` (database and Redis), and `/v1/ping` gives 401 without or with a wrong token and 200 with the right one. On production `vercel curl /api/health` returns ok; the production domain still serves the Squarespace parking page until the cutover in 1.9, so production was checked on the Vercel deployment URL. No private keys or secrets in tracked files (the only matches are a dummy test fixture and runbook text), and the client bundle scan passes in CI
- [x] ADRs 0001 to 0007, threat model v1 and privacy v1 committed (ADR 0008 is written with the 1.3 Kit spike)

---

## Phase 1 - Landing page (first public release)

### 1.1 Design system and layout (mobile first, 375px before wider)
- [x] Finalise colour scheme and apply to tokens: Dawn patrol (light) and Night swell (dark), per `docs/design`
- [x] Light and dark via `prefers-color-scheme` plus cookie-backed toggle (no flash on SSR)
- [x] Shared UI primitives: button, input, textarea, checkbox, label, field error (plain styled native elements; Radix arrives with the menu dialog)
- [x] Sticky header with single CTA; accessible mobile menu (Radix Dialog, non-modal so the button toggles it)
- [x] Touch targets at least 44px; safe-area insets; `prefers-reduced-motion` respected
- [x] Browser chrome follows the scheme: `export const viewport` in `layout.tsx` with `themeColor` for light and dark (`prefers-color-scheme` media), values from the tokens; `viewport-fit=cover` so safe-area insets apply on notched phones
- [x] Inline SVG logo using `--logo-ring` and `--logo-wave` tokens
- [x] Tests: theme toggle, menu keyboard and focus behaviour; header without JavaScript shows the links in a noscript nav

### 1.2 Page sections (statically generated, Server Components)
- [x] Hero (Mark 4:41 + logo)
- [x] About / who it is for (Hendrik's own words; on screens below `lg` the last row's line is the only divider)
- [x] What's coming (weekly devotional, teaching series, audio) with the latest devotional as the surf report; the weekly card is labelled "Rolling in consistently"
- [x] Start here (gospel in 4 steps; wording to be read by a pastor or elder before launch)
- [x] Statement of faith: four points, no placeholder (a full-statement link appears once a page or URL exists)
- [x] Writer section: `Henno (AKA "H")`, Harvest Christian Church, faith story and a square surfing photo (`public/henno-surfing.jpg`)
- [x] Footer with the full ESV notice per the Crossway API terms: usage-limit line, Creative Commons and translation sentence, www.esv.org link, "(ESV)" on quotations (social and privacy links appear when their addresses exist: privacy in 1.6)
- [x] Theme toggle moved to the header: top right from `lg`, a Theme row in the mobile menu below `lg`
- [x] Scripture references stored as structured data (`book`, `chapter`, `verses`)
- [x] Content in typed TS (`apps/web/src/content/landing.ts`); mockup "design notes" and "Ideas for Hendrik" excluded. `pnpm check:placeholders` lists leftover [bracketed] draft copy and is a launch gate (1.9)
- [x] Images via `next/image` (AVIF then WebP, explicit `sizes`, lazy by default). The writer photo and devotional art go through `ContentImage` (no inline styles, which the nonce CSP blocks); the logo is inline SVG
- [x] Screenshot review at 375, 768, 1280 against `docs/design/wotw_landing_page.html` (differences are deliberate: design document over mockup quirks, no dead links)

### 1.2b Devotional pages and series (built ahead of the CMS)
- [x] Devotionals as markdown with front matter in `apps/web/content/devotionals`, series in `content/series`; loader and schema validation (`src/lib/devotionals`); format in `docs/devotional_format.md`
- [x] Page `/devotionals/<slug>`: crumbs, art, Conditions, Lineup, Word, Paddle Out, Pray, Go Deeper, verse card, series nav, surf report, series list; light and dark art
- [x] Shown from `publishAt` (UTC) with no redeploy; the landing card follows the calendar; `DEVOTIONAL_TODAY` previews another day
- [x] `pnpm check:devotionals` validates the files; three Advent devotionals published (5, 12 and 19 December 2026), credited to "H"
- [x] Tests: unit for the loader, view and page; e2e on five browser projects with the date pinned
- [ ] Article JSON-LD, sitemap entries and the devotional archive page (step 1.6 and Phase 2.3)
- [ ] Sign-up form in the closing band (arrives with 1.3)

### 1.2c Bible reader (built ahead of the plan, behind `BIBLE_ENABLED`)
Its own plan and checklist live in [bible_feature.md](bible_feature.md) (steps B0 to B9). Summary of where it stands:
- [x] B1 book data, B2 BSB and WEB import (about 15 MB of chapter JSON, `pnpm build:bible`), B3 passage source, B4 reader pages, B5 pickers, B6 previous and next chapter (PRs #71 to #75)
- [x] Picker redesign: columns popover from `lg` (books with a filter, chapters in pages of 25, a verse grid where one click is one verse and a second click a range) and a tabbed bottom sheet below `lg` (Book, Chapter, Verses tabs showing the current choice); chosen from three mockups each in `design/bible_mockups.html`
- [x] Fixed on the way: two mounted pickers shared one radio group name, so choosing in one unchecked the other (each picker now has its own name)
- [x] `DEV_ORIGINS` in `.env` lets a phone on the same Wi-Fi open `pnpm dev`
- [ ] B7 ESV source: blocked until Crossway approves the API application (applied 2026-11-07)
- [ ] B8 compliance gate and B9 docs and launch (turn `BIBLE_ENABLED` on in Production)
- [ ] Possible later: a type-it search box as a shortcut on top of the pickers (mockups B and M3), swipe between chapters

### 1.3 Email sign-up (Kit, double opt-in)
Kit owns the subscriber list, the double opt-in confirmation email, unsubscribe links and the legal footer (ADR 0008). Our API validates, defends and forwards.
- [x] Kit setup **(Hendrik)**: create the sign-up form in Kit with double opt-in on, sender `hello@wordonthewater.net`, a confirmation email and a redirect to our `/thank-you` page on `https://wordonthewater.net` (the page is built in this step, below; leave the redirect pointing at the test site until it exists); note the form id; create an API key in Kit developer settings
- [x] Spike first (done 2026-11-07, result in [ADR 0008](adr/0008-kit-subscriptions.md): create the subscriber with `state: "inactive"`, then add it to the form by id; Kit sends the confirmation and the state becomes `active` on confirmation): against a Kit test form, prove which calls trigger the double opt-in confirmation email (create subscriber, then add to form by id or by email) and what state the subscriber has until confirmed; record the result in ADR 0008
- [x] `integrations/kit/client.py`: small async client (httpx) for `https://api.kit.com/v4` with `X-Kit-Api-Key`: `create_subscriber` (as `inactive`), `add_to_form` and `subscribe` (both, in order); a 429 raises `KitRateLimitedError` so the outbox retries later; errors never carry the address or the key; tested against a fake Kit server (`tests/test_kit_client.py`) and once by hand against the Kit test form (an already confirmed subscriber stays `active`). Find by email and unsubscribe are added when a step needs them (webhook mirror, data deletion)
- [x] API: Pydantic schema in `app/schemas/subscribers.py` (`extra="forbid"`, email <= 254 and validated, first name <= 80 and optional, `source` and `consent_text_version` short labels)
- [x] `POST /v1/subscribers`: always 202 with the identical body `{"status": "check_your_inbox"}` (no enumeration across new, pending, confirmed). A new address is stored as `pending` with its consent version, time and source and a `kit_subscribe` job is queued in the outbox; a still pending address is queued again; confirmed, unsubscribed and bounced addresses change nothing (`app/services/subscribers.py`, race-safe with `ON CONFLICT DO NOTHING`; tests against real Postgres). Open: how Kit treats someone who unsubscribed and signs up again (step below)
- [x] Honeypot and minimum time-to-submit (`app/services/bot_checks.py`): the request carries a hidden `website` field (people leave it empty) and `rendered_at` (milliseconds when the form was rendered; the page renders per request, so the server sets it). A filled field, or a form sent within `SIGNUP_MIN_SECONDS` (default 3) of rendering or with a time in the future, gets the normal 202 and stores nothing; it is logged as `signup_bot_rejected` with the reason only. The web form (below) must send both fields
- [x] Turnstile verification (`app/integrations/turnstile.py`): the request carries `turnstile_token`; after the cheap bot checks the API sends it to Cloudflare's siteverify with the visitor IP. A token Cloudflare refuses is a 400 `turnstile_failed`; if Cloudflare cannot judge it (outage, network error, a fault with our key) or `TURNSTILE_SECRET_KEY` is not set, a 503 `turnstile_unavailable` and nothing is stored, so a sign-up is never accepted unchecked. Production refuses Cloudflare's test secrets. Local runs and tests use Cloudflare's always-pass test keys (`make setup` writes them)
- [ ] Real Turnstile keys **(Hendrik)**: create a Turnstile widget in Cloudflare (hostnames `wordonthewater.net`, `www.wordonthewater.net` and the Vercel preview and localhost hosts, or one widget per environment); put the secret in `TURNSTILE_SECRET_KEY` (API project, Sensitive) and the site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (web project) for Preview and Production
- [x] Rate limits on the sign-up: 5 an hour per visitor address and 3 an hour per email (so nobody can be mail-bombed with confirmations), checked after validation and before the bot checks and Turnstile; the sixth gets a generic 429 with `Retry-After`. Idempotency: an `Idempotency-Key` header (8 to 128 letters, digits, `-`, `_`) makes a repeat of a request that already worked return the same 202 without doing anything, costing neither a Turnstile token (they are single use) nor allowance; a failed attempt gives its key back so the visitor can retry (`app/services/idempotency.py`, keys stored only as salted hashes, a day). The web form sends a new key per page render
- [ ] API client IP: the API side is done and tested (it trusts `X-Client-IP` only after service-token auth, and two visitors have separate allowances); still to do in the web Server Action: every visitor-facing `apiFetch` passes `clientIp`, with a test that two visitors do not share a limit (the API logs `client_ip_fallback` when it is missing)
- [x] Consent text version, timestamp and source recorded in our `subscribers` row and sent to Kit as the form `referrer` (stored on the subscriber row by the endpoint; the Kit job builds the referrer as `https://wordonthewater.net/?source=<source>&consent=<version>`, tested)
- [x] Kit call goes through the outbox (a `kit_subscribe` job) with an immediate best-effort attempt after the request; retries with backoff if Kit is down, so a Kit outage never loses a sign-up or breaks the form Done: the `kit_subscribe` job is drained by the cron (`app/services/kit_jobs.py`, retried with backoff like emails, 5 attempts, safe error text, the first name wiped from the outbox once sent, the Kit id kept on the subscriber) and tried once straight after the response in a background task with its own database session (the visitor never waits for Kit, so timing reveals nothing). Not tried when Kit is not configured. **Verify on a Vercel preview** that the background task finishes after the response; if Vercel cuts it off, the daily cron (every 5 minutes on Pro) still delivers it
- [x] Migration: add `kit_subscriber_id` to `subscribers`; drop the confirm and unsubscribe token columns (Kit handles tokens) (`471ab1c015c8`, upgrade and downgrade checked, `alembic check` clean)
- [ ] `POST /v1/webhooks/kit`: verify `X-Kit-Signature` (`t=...,v1=...`, HMAC-SHA256 over `{t}.{raw body}`, constant-time compare, 5 minute tolerance, any matching `v1` accepted), dedupe on event id, update `subscribers.status` from `subscriber.activated`, `subscriber.unsubscribed`, `subscriber.bounced`, `subscriber.complained`
- [ ] Webhook endpoint registered in Kit (`POST /v4/webhook_endpoints`, secret stored as `KIT_WEBHOOK_SECRET`); decide how Kit reaches the protected API project (Vercel protection bypass in the URL, or a route on the web project) and record it in ADR 0008
- [ ] Web: `react-hook-form` + Zod, Server Action with progressive enhancement, visible labels, correct `type/inputmode/autocomplete`, errors in `aria-live`
- [ ] "Check your inbox" message shown in the sign-up form itself after a successful submit (same text whether the email is new, pending or already confirmed); the confirmation and unsubscribe pages themselves are Kit-hosted
- [ ] **Thank-you page `/thank-you`** (Kit sends new subscribers there after they sign up and again after they confirm; today `/thank-you` does not exist, so Kit's redirect lands on "Page not found" on the test site). Build it before the Kit form's redirect is set and before the test site is used for a real sign-up:
  - [ ] Tests first: the page returns 200, has one `h1`, a link back to the home page and to the latest devotional, `noindex` metadata, no personal data in the URL or the page, light and dark, axe clean, and works with JavaScript off
  - [ ] One page serves both visits, with copy that is right for each: after sign-up "Check your inbox and tap the link to confirm"; after confirmation "You are in". If Kit can send a different redirect URL for each step, use `/thank-you?step=confirmed` for the second (confirm this in the Kit spike and record it in ADR 0008); otherwise keep the wording neutral and true for both
  - [ ] Mobile first at 375px, from the existing section components and tokens; no sign-up form on it
  - [ ] Add it to the CSP and `robots` checks (not in the sitemap), and to the e2e navigation test on all six projects
  - [ ] Set the redirect URLs in the Kit form (test form on the test site first, the production form on `https://wordonthewater.net/thank-you` at launch) **(Hendrik)** and verify by signing up with a real test address end to end: sign-up lands on `/thank-you`, the confirmation email arrives, confirming lands on `/thank-you` again
- [ ] Tests: happy path, validation, enumeration safety, rate limit, bot rejection, Kit down then retried, webhook signature valid, invalid, expired and replayed
- [ ] Threat model updated (new third party holding subscriber email, new inbound webhook)

### 1.4 Prayer request form
- [ ] `crypto.py`: AES-256-GCM envelope encryption, `key_id` per row, rotation supported
- [ ] Encryption key in secret manager; key rotation documented in runbook
- [ ] `POST /v1/prayer-requests` (202), text <= 2,000, `share_with_team` and `wants_reply` consent flags
- [ ] Rate limit 3/hour/IP; Turnstile; honeypot; idempotency
- [ ] Notification email to `prayer@wordonthewater.net` (setting `PRAYER_INBOX`): full text only if consent ticked, otherwise "a new request is waiting" **(Hendrik: confirm default)**
- [ ] `delete_after` set to 90 days
- [ ] Prayer text never in logs, Sentry or analytics (verified by test)
- [ ] Web form with same standards as sign-up
- [ ] Tests: encryption round trip, wrong key fails, consent branches, no-leak assertions
- [ ] Threat model updated

### 1.5 Contact form
- [ ] `POST /v1/contact` (202) with limits, Turnstile, honeypot, rate limit
- [ ] Notification via outbox to `hello@wordonthewater.net` (setting `CONTACT_INBOX`); `delete_after` 12 months
- [ ] Web form and tests

### 1.6 Legal, SEO and trust
- [ ] Privacy policy page (matches `docs/privacy.md`) **(Hendrik: review)**
- [ ] `/.well-known/security.txt` (`Contact: mailto:hello@wordonthewater.net`, `Canonical: https://wordonthewater.net/.well-known/security.txt`, `Expires` within a year)
- [ ] Real addresses on the page in place of the mockup placeholders: `prayer@wordonthewater.net` for prayer, `hello@wordonthewater.net` for contact and the footer
- [ ] `generateMetadata`, canonical URLs, Open Graph image, JSON-LD `Organization`
- [ ] `sitemap.ts` and `robots.ts`
- [ ] Installable, app-like experience (step-by-step in [PWA_checklist.md](PWA_checklist.md)) with `app/manifest.ts` (`MetadataRoute.Manifest`, see `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`): `name`, `short_name` ("Word on the Water" / "WotW"), `description`, `id` and `start_url` `/`, `scope` `/`, `display: "standalone"`, `orientation: "portrait"`, `lang: "en"`, `categories`, `background_color` and `theme_color` from the tokens
- [ ] Icons: 192 and 512 px PNG (`purpose: "any"`), 512 px maskable with the logo inside the safe zone, `app/icon.svg` favicon and `app/apple-icon.png` (180 px) for iOS home screens; generated from the inline SVG logo
- [ ] Manifest `shortcuts` to the sections people return to ("Start here", "Prayer request") and `screenshots` (narrow, 375 px) for the richer install sheet on Android
- [ ] iOS: `metadata.appleWebApp` (`capable`, `title`, `statusBarStyle`) so the home-screen launch looks native
- [ ] Tests: unit test of the manifest object (required fields, icon sizes and purposes, colours match tokens); e2e that `/manifest.webmanifest` and every icon return 200 with the right content type under the CSP
- [ ] Run CSP in report-only on staging, then enforce in production after violations are reviewed

### 1.7 Retention and operations
- [ ] Retention job: unconfirmed subscribers 7 days (mirror row and, if Kit keeps them, the Kit subscriber via API), prayer 90 days, contact 12 months, audit logs 1 year
- [ ] Tests with time-shifted fixtures
- [ ] Vercel Cron configured and verified in preview
- [ ] Alerts: error rate, 5xx, failed email sends, DB connection failures, cert expiry

### 1.8 Quality gates
- [ ] Playwright e2e on iPhone SE/13, Pixel 7, desktop Chromium/WebKit/Firefox: sign-up via Mailpit, prayer form, navigation
- [ ] `@axe-core/playwright` on every page: zero serious or critical
- [ ] Lighthouse CI mobile: Performance >= 95, Accessibility 100, Best Practices 100, SEO 100
- [ ] LCP < 2.0 s, CLS < 0.05, INP < 200 ms, landing JS < 100 KB gzipped
- [ ] Re-measure LCP on a deployed preview because pages render per request (ADR 0007); revisit hash-based CSP if the budget fails
- [ ] API service coverage >= 85%
- [ ] ZAP baseline scan against staging: no high findings
- [ ] Manual pass: keyboard only, VoiceOver iOS, TalkBack
- [ ] Real device check on a mid-range Android phone
- [ ] Installability: Chrome DevTools Application panel shows no manifest errors (Lighthouse no longer has a PWA category); manual "Install app" on Android Chrome and "Add to Home Screen" on iOS Safari: icon, name, splash colours, standalone launch, safe areas

### 1.9 Launch
- [x] Domain `wordonthewater.net` registered, with mailboxes `hello@` and `prayer@`
- [ ] Add `wordonthewater.net` to the `wotw-web` Vercel project (apex primary, `www` redirecting to it), add the DNS records Vercel shows for the domain in **Squarespace DNS** (apex A record and `www` CNAME; copy the exact values from the Vercel dashboard), leave the MX records alone, check HTTPS and HSTS; keep `wotw-api` on its protected `vercel.app` URL **(Hendrik)**
- [ ] Production env vars: `EMAIL_FROM=Word on the Water <hello@wordonthewater.net>`, `PRAYER_INBOX=prayer@wordonthewater.net`, `CONTACT_INBOX=hello@wordonthewater.net`, public site URL `https://wordonthewater.net` for metadata, sitemap and links in email; Preview keeps test inboxes
- [ ] Upgrade to Vercel Pro; restrict production promotion; audit log on
- [ ] With Pro: log drain to a log store (Better Stack or Axiom) and a staging environment (custom Vercel environment), deferred from 0.10
- [ ] Outbox cron to `*/5 * * * *` in `apps/api/vercel.json` and the deploy runbook (only possible on Pro; Hobby fails the deploy) **(Hendrik)**
- [ ] Vercel Firewall rate-limit rules on form routes
- [ ] On the root domain `wordonthewater.net` (the `From` addresses are on it): one merged SPF record in Squarespace DNS including Postmark and Kit (edit the current record and keep what Squarespace email forwarding put there, never add a second), DKIM for each, a custom return-path for each, DMARC at `_dmarc.wordonthewater.net` with `p=none` and reports to `hello@wordonthewater.net`
- [ ] Kit sending domain authenticated, sender `hello@wordonthewater.net`, confirmation email branded; production Kit API key and webhook secret set in Vercel Production only
- [ ] Postmark sender signature or domain verified for `hello@wordonthewater.net`; `hello@` and `prayer@` are Squarespace forwards to Hendrik's mailbox, so send a test from Postmark to each and confirm it arrives after forwarding (inbox, not spam) and check the SPF, DKIM and DMARC results in the headers; if forwarding is unreliable, point `PRAYER_INBOX` and `CONTACT_INBOX` straight at the destination mailbox; optionally set up "send mail as" so replies come from `hello@` and `prayer@`
- [ ] `migrate.yml` with manual approval; production auto-promotion off; promote after migrations and smoke tests
- [ ] Rollback rehearsed (Instant Rollback)
- [ ] Backup restore tested from nightly dump and Neon PITR
- [ ] Production smoke test: subscribe, confirm via the Kit email, unsubscribe via the Kit link (our mirror shows `unsubscribed`), prayer request received by prayer inbox

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
- [ ] Subscriber counts and status read from our mirror; list management and export stay in the Kit dashboard
- [ ] Contact messages view

### 2.3 Devotional content
- [ ] Decide whether to move devotionals from repo markdown (Phase 1) to `devotionals`, `series`, `scriptures`, `tags` tables with an authoring UI, or keep files and add only search
- [ ] Authoring UI: draft, preview, schedule, publish (sanitised, never raw HTML from users)
- [ ] Public archive page (the detail page and series list exist from step 1.2b; pages render per request under the nonce CSP, ADR 0007, so revisit ISR), 62ch measure, Lora body
- [ ] RSS feed, Article JSON-LD, sitemap updates
- [ ] Basic search with Postgres full-text

### 2.4 Weekly email
- [ ] Publishing a devotional creates a Kit broadcast (`POST /v4/broadcasts`) as a draft (`send_at` null): subject, preview text, rendered HTML content, internal description, subscriber filter by tag or segment
- [ ] Spike first: confirm how a draft is scheduled (update with `send_at`), whether the chosen Kit template adds the unsubscribe link and address footer, and that sending is allowed on our Kit plan; otherwise put `{{ unsubscribe_url }}` and `{{ address }}` in our content
- [ ] Send a test to Hendrik before scheduling; the editor schedules from our admin UI or from Kit
- [ ] Kit sends only to active subscribers and adds the unsubscribe link; bounces and complaints reach us through the Kit webhook (built in 1.3)
- [ ] Failed broadcast creation is visible in the admin UI and retried

### 2.5 Mobile app decision gate
- [ ] Revisit the native app (`docs/FLUTTER.md`, option B: keep this Next.js site and add a Flutter app for iOS and Android on the same FastAPI) once devotionals exist **(Hendrik)**
- [ ] Until then, consider Web Push for the weekly devotional (Next PWA guide; iOS only for sites added to the home screen, iOS 16.4+)

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
- [ ] PWA offline caching of recent devotionals: service worker (`public/sw.js` with `Cache-Control: no-cache` and its own CSP, per the Next PWA guide), update strategy, offline page; evaluate Next's experimental `useOffline`
- [ ] If the Phase 2 gate chose a Flutter app: build it here (`docs/FLUTTER.md`)
- [ ] Re-run performance budgets with audio pages

**Exit gate Phase 3**
- [ ] A series with audio plays on mobile and in a podcast app; offline devotional reading works

---

## Phase 4 - Community (only if wanted)

- [ ] Decision gate **(Hendrik)**: build any of these at all?
- [ ] Public accounts: Argon2id or passkeys only, breached-password check, lockout/backoff, email verification
- [ ] Favourites and reading plans
- [ ] Comments with moderation queue and abuse reporting
- [ ] Giving via hosted provider (Stripe Checkout); no card data touches our systems. Not planned: needs the Crossway ESV license first
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
- [x] 2. Domain name: `wordonthewater.net`, mailboxes `hello@wordonthewater.net` and `prayer@wordonthewater.net`
- [x] 3. Email provider: Kit for subscriptions and newsletters; Postmark (assumed, still to confirm) for transactional mail, since Kit has no transactional send API
- [ ] 4. Who reads prayer requests; may full text be emailed
- [ ] 5. Auth needs beyond admin
- [ ] 6. Audience jurisdictions for privacy law
- [ ] 7. Built-in admin vs headless CMS
- [x] 8. Colour scheme: Dawn patrol (light) and Night swell (dark), applied to the tokens
- [x] 9. Donations: none planned; the ESV free terms are non-commercial, so a Crossway license is needed first if that changes
- [x] 10. GitHub account/org and repo name (public repo `thecodeblock-hendrik/word-on-the-water`, no license)
