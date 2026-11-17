# PLAN.md - Word on the Water

Step-by-step build plan derived from `CLAUDE.md`. Tick boxes as work completes. When this plan and `CLAUDE.md` disagree, fix one of them in the same change.

## How to use this plan

- Work top to bottom. Do not start a phase until the previous phase's **Exit gate** is ticked.
- Each step is small. Validate it (run it, test it, look at it) before ticking.
- Bugs: reproduce, prove the root cause, then fix, with a test that failed before the fix.
- Before adding a dependency or using an API, check the current docs and use the latest stable version.
- Security items are part of each phase, not a separate phase at the end.
- Anything that changes the stack, data model or security posture needs an ADR first.

- **Retired documents:** the chat build checklist, the landing page UI checklist, the threat plan, the secrets guide, the Kit setup and webhook guides, the 16 November next steps and the LCP investigation notes are in [archive/](archive/). Their outstanding items were moved into this plan (not launch related) or into [production_checklist.md](production_checklist.md) (launch related) on 2026-11-16, so this plan and the checklist are the only two lists to follow.
- **Workflow:** one branch and one PR per sub-step (for example `feat/0.9-vercel`), Conventional Commits, one commit per logical chunk, push once per sub-step. Merge with `gh pr merge --squash --admin` only when every check is green. Stage named files, never a blanket `git add -A`.

Legend: `[ ]` todo, `[x]` done. **(Hendrik)** marks a decision or action needed from the owner.

---

## Status (updated 2026-11-16)

| Phase | Status |
|---|---|
| 0 Foundations | Exit gate passed 2026-11-01; open carry-over: web coverage in CI. Done: 0.1 repo and tooling, 0.2 ADRs, 0.3 API skeleton, 0.4 database, 0.5 email and outbox, 0.6 web skeleton, 0.7 OpenAPI types, 0.8 CI and branch protection; 0.9 Vercel and external services nearly done (Neon preview branching open). 0.10 observability and docs, exit gate |
| 1 Landing page | In progress. 1.1 design system and layout done (PR #59); 1.2 page sections done with real copy (PRs #60, #66; only two social-handle placeholders remain); the devotional page, series and landing card are built from repo content (PRs #64, #65, step 1.2b; five Advent devotionals). A Bible reader (BSB and WEB) is built ahead of the plan behind `BIBLE_ENABLED` (see "Bible reader" below). 1.3 email sign-up is built, merged (PR #78) and proven end to end on a Vercel preview (2026-11-08); the Kit webhook route is built too. What remains of 1.3 is housekeeping; everything that needs the live `wordonthewater.net` domain (Kit redirect and webhook registration, PWA, DNS, launch) is in [production_checklist.md](production_checklist.md). **The prayer request form (1.4) and contact form (1.5) are not part of the launch (decided 2026-11-14)**; the page has no prayer option meanwhile (the Prayer link was removed from the menus and footer on 2026-11-15) and `hello@` is the contact address. Next: the remaining 1.6 items and the 1.8 quality gates. The Got Questions chat (1.10, [chat.md](archive/chat.md), ADR 0009) is built and tested behind `CHAT_ENABLED`; it is switched on in Production (checked 2026-11-16 on the live deployment); what remains is its walk-through (Part L). **1.8 quality gates are mostly done (2026-11-16):** Lighthouse CI with real throttling, axe, e2e on six browser projects, the weekly ZAP baseline, API coverage and the LCP, CLS, INP and JS budget are ticked; the manual passes, the Android check and making Lighthouse a required check are left, plus the final landing page review (1.11) |
| 2 Devotionals and admin | Not started. The weekly email (2.4) is partly built ahead of the phase: the Kit draft path (`KitClient.create_broadcast`, the dark email renderer and `pnpm broadcast:devotional`) works against the real Kit; delivery from `hello@` waits for Kit's DKIM (production_checklist.md, Parts E and K) |
| 3 Teaching series and audio | Not started |
| 4 Community | Not started (decision gate) |

**Launch date: Saturday 28 November 2026** (set 2026-11-14). The first devotional, More Than Watchmen, goes live that day, and the weekly rhythm follows (5, 12 and 19 December). Everything in [production_checklist.md](production_checklist.md) that the launch needs (domain, email authentication, Kit redirect and webhook, smoke test, the first broadcast) has to be done by then.

**Where the code stands:** API with health, readiness, cron drain and a default-deny `/v1` router; five database tables with a reviewed migration; email providers (Postmark, SMTP, console), templates and a retrying outbox; Next.js site with tokens, fonts, nonce CSP, security headers, the landing page (hero, about, what's coming, start here, beliefs, writer, footer with the ESV notice), a header with the theme toggle and mobile menu, and devotional pages and a series list built from markdown in `apps/web/content` (five Advent devotionals, credited to "H"); generated TypeScript API types; CI with e2e on six browsers; branch protection on `main`. A Bible reader for the BSB and WEB (public-domain text in `apps/web/content/bibles`) with a columns picker on desktop, a tabbed sheet on phones, previous and next chapter and a remembered version, behind `BIBLE_ENABLED=1` (the ESV waits for Crossway's approval). The sign-up form (Kit double opt-in, Turnstile, rate limits, outbox retry), the Kit webhook mirror and `/thank-you` are built. Also built since: the sign-up form with Kit double opt-in (Turnstile, rate limits, outbox retry), `/thank-you`, the Kit webhook mirror and its forwarder route on the web project, all proven end to end on a Vercel preview; production is deployed and migrated but not public. Also built (2026-11-14): the weekly email draft path for Kit (step 2.4). Also built: the Got Questions chat (step 1.10, behind `CHAT_ENABLED`) and the privacy page. Not built yet: the prayer and contact forms (1.4, 1.5). The PWA (icons, manifest, shortcuts, screenshots, iOS settings, no service worker) is built on PR #136 and waits for the install checks on a preview ([PWA_checklist.md](PWA_checklist.md) steps 7 and 8; production_checklist.md Part C).

**Decisions made so far:** mobile strategy is option B long term (Next.js website as an installable PWA now; a Flutter app for iOS and Android revisited at the Phase 2 gate, see `docs/FLUTTER.md`); Neon over Supabase (ADR 0002); nonce CSP with per-request rendering, hash-based option rejected after a browser test (ADR 0007); no license and a public repo; the site is free with no donations, so the ESV is used under Crossway's free non-commercial terms; Phase 1 devotionals live in the repo as markdown; the Bible reader ships public-domain BSB and WEB from the repo and the ESV from the API later; Dawn patrol (light) and Night swell (dark) colour schemes; test-first for all logic; branch protection with the owner not enforced. Neon preview branching is on (a copy of `preview-base` per git branch); Kit webhooks reach the API through a forwarder route on the web project; launch-time steps live in [production_checklist.md](production_checklist.md) until the domain goes live.

**Waiting on Hendrik:** the launch checklist ([production_checklist.md](production_checklist.md)); in 1.8 the manual passes (keyboard only, VoiceOver, TalkBack), a real mid-range Android phone check and making `Lighthouse (mobile)` a required check in branch protection; in 1.11 reading the copy; and the prayer-notification default when 1.4 is built.

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
- [x] ADR 0008 Kit for subscriptions and newsletters (written with the 1.3 spike; narrows ADR 0004 to transactional email only)

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
- [x] Neon (Marketplace): pooled and direct URLs done (`NEON_*` prefix); **branch per preview is on** (seen in the Neon branch list on 2026-11-08: `preview/feat/1.3-kit-signup`, created by Vercel, parent `preview-base`, with a link to its Vercel deployment)
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
- [x] Writer section: `Henno (AKA "H")`, Harvest Christian Church, faith story and a square surfing photo (`content/site/founder/henno-surfing.jpg`)
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
- [x] `pnpm check:devotionals` validates the files; five Advent devotionals published (28 November, 5, 12, 19 and 26 December 2026), credited to "H"
- [x] Tests: unit for the loader, view and page; e2e on five browser projects with the date pinned
- [ ] Article JSON-LD, sitemap entries and the devotional archive page (step 1.6 and Phase 2.3)
- [x] Sign-up form in the closing band: the `SubscribeBand` (`#subscribe`) now holds the form on the landing page and at the end of every devotional (1.3)

### 1.2c Bible reader (built ahead of the plan, behind `BIBLE_ENABLED`)
Its own plan and checklist live in [bible_feature.md](bible_feature.md) (steps B0 to B9). Summary of where it stands:
- [x] B1 book data, B2 BSB and WEB import (about 15 MB of chapter JSON, `pnpm build:bible`), B3 passage source, B4 reader pages, B5 pickers, B6 previous and next chapter (PRs #71 to #75)
- [x] Picker redesign: columns popover from `lg` (books with a filter, chapters in pages of 25, a verse grid where one click is one verse and a second click a range) and a tabbed bottom sheet below `lg` (Book, Chapter, Verses tabs showing the current choice); chosen from three mockups each in `design/bible_mockups.html`
- [x] Fixed on the way: two mounted pickers shared one radio group name, so choosing in one unchecked the other (each picker now has its own name)
- [x] `DEV_ORIGINS` in `.env` lets a phone on the same Wi-Fi open `pnpm dev`
- [ ] B7 ESV source: blocked until Crossway approves the API application (applied 2026-11-07)
- [ ] B8 compliance gate and B9 docs and launch (`BIBLE_ENABLED` is set in Production since 2026-11-16 and `/bible` serves there; the compliance gate and the rest of B9 remain)
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
- [x] Real Turnstile keys **(Hendrik)**: create a Turnstile widget in Cloudflare (hostnames `wordonthewater.net`, `www.wordonthewater.net` and the Vercel preview and localhost hosts, or one widget per environment); put the secret in `TURNSTILE_SECRET_KEY` (API project, Sensitive) and the site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (web project) for Preview and Production Done 2026-11-07: two widgets (production: `wordonthewater.net`, `www.wordonthewater.net`; preview: `localhost`, `vercel.app`), secrets on `wotw-api` and site keys on `wotw-web` for Preview and Production. A widget refuses any other hostname (Turnstile error 110200, "domain not allowed"), so the production widget will not work on a `*.vercel.app` production address: production sign-up can only be tested on the real domain (step 1.9).
- [x] Rate limits on the sign-up: 5 an hour per visitor address and 3 an hour per email (so nobody can be mail-bombed with confirmations), checked after validation and before the bot checks and Turnstile; the sixth gets a generic 429 with `Retry-After`. Idempotency: an `Idempotency-Key` header (8 to 128 letters, digits, `-`, `_`) makes a repeat of a request that already worked return the same 202 without doing anything, costing neither a Turnstile token (they are single use) nor allowance; a failed attempt gives its key back so the visitor can retry (`app/services/idempotency.py`, keys stored only as salted hashes, a day). The web form sends a new key per page render
- [x] API client IP: the API trusts `X-Client-IP` only after service-token auth and two visitors have separate allowances (tested); the web Server Action passes the visitor's address from `x-real-ip` / `x-forwarded-for` (`clientIpFrom`, tested)
- [x] Consent text version, timestamp and source recorded in our `subscribers` row and sent to Kit as the form `referrer` (stored on the subscriber row by the endpoint; the Kit job builds the referrer as `https://wordonthewater.net/?source=<source>&consent=<version>`, tested)
- [x] Kit call goes through the outbox (a `kit_subscribe` job) with an immediate best-effort attempt after the request; retries with backoff if Kit is down, so a Kit outage never loses a sign-up or breaks the form Done: the `kit_subscribe` job is drained by the cron (`app/services/kit_jobs.py`, retried with backoff like emails, 5 attempts, safe error text, the first name wiped from the outbox once sent, the Kit id kept on the subscriber) and tried once straight after the response in a background task with its own database session (the visitor never waits for Kit, so timing reveals nothing). Not tried when Kit is not configured. **Verify on a Vercel preview** that the background task finishes after the response; if Vercel cuts it off, the daily cron (every 5 minutes on Pro) still delivers it **Verified 2026-11-08 on the preview:** the sign-up returned 202, the Kit subscriber was created (201) and added to the form (201) in the same request, and became `active` after the confirmation link was clicked. Still to record in ADR 0008.
- [x] Migration: add `kit_subscriber_id` to `subscribers`; drop the confirm and unsubscribe token columns (Kit handles tokens) (`471ab1c015c8`, upgrade and downgrade checked, `alembic check` clean)
- [x] `POST /v1/webhooks/kit` (`app/routers/webhooks.py`, no service token: the signature is the credential): verifies `X-Kit-Signature` (`t=...,v1=...`, HMAC-SHA256 over `{t}.{raw body}` keyed with the whole `whsec_...` secret, constant-time compare, 5 minute tolerance, any matching `v1` accepted for rotation), then dedupes on the event id (Redis claim, given back if applying fails so a retry is not a duplicate), then updates `subscribers.status` from `subscriber.activated` (active, confirmation time kept, Kit wins over an earlier unsubscribe), `subscriber.unsubscribed` and `subscriber.complained` (unsubscribed) and `subscriber.bounced`; people we have no record of and other events are ignored. 401 for a bad or old signature, 503 when no secret is set (Kit retries), 400 for a body that is not a delivery, 500 on a failure (Kit retries up to 8 times over about 41 hours). The general 16 KB body limit is 1 MB for this path only (found and fixed: a delivery of 100 events is about 25 KB). A test calls every `/v1` path with no credentials, so a new route that forgets the service token fails. The HMAC key format (whole string with the prefix) comes from the docs' example code: **confirm with the first real delivery**
- [x] Kit webhook route: the registration tool (`make kit-webhook`) and the forwarder `POST /api/webhooks/kit` on the web project are built and tested (decision in ADR 0008: Kit cannot pass the API project's login wall, so the web project forwards the raw body and adds the bypass secret server-side). Registering it in Kit needs the live domain: see [production_checklist.md](production_checklist.md), Part H
- [x] Web: the form is a React 19 `useActionState` form with a Server Action and Zod (`src/lib/signup.ts`, `src/lib/actions/subscribe.ts`, `src/components/signup/signup-form.tsx`), not react-hook-form: one field and one optional field need no form library. Visible labels, `type`/`inputmode`/`autocomplete` set, errors beside the field and in a live region, typed values kept after an error (React clears a form after its action), the hidden trap field, `rendered_at` and a per-render idempotency key, Cloudflare Turnstile with `data-appearance="interaction-only"`. **Turnstile loads only when the form is near the screen or used** (IntersectionObserver, 400px margin; otherwise on focus): its script and background requests cost every page view and kept the page from ever going network-idle. A used token is replaced after an API error. Without JavaScript the form says why and gives `hello@wordonthewater.net`. Tests: unit (form, action, parsing) and e2e on five browser projects against a stub API (`tests/e2e/stub-api.mts`)
- [x] "Check your inbox" message shown in the sign-up form itself after a successful submit (the form is replaced by it, with a spam-folder hint); the confirmation and unsubscribe pages themselves are Kit-hosted
- [x] **Thank-you page `/thank-you`** (Kit sends new subscribers there after they sign up and again after they confirm; today `/thank-you` does not exist, so Kit's redirect lands on "Page not found" on the test site). Build it before the Kit form's redirect is set and before the test site is used for a real sign-up:
  - [x] Tests first: unit (`tests/unit/thank-you.test.tsx`) and e2e (`tests/e2e/signup.spec.ts`): 200, one `h1`, links back to the home page and the latest devotional, `noindex, nofollow`, no form, no CSP violation, axe clean in light and dark
  - [x] One page, one visit: because our own form calls the API, the only time a visitor lands on `/thank-you` is after clicking the confirmation link in Kit's email (our form shows "check your inbox" in place), so the copy says "You're in" and what comes next. Whether Kit can send different redirect URLs stays an open point in ADR 0008
  - [x] Mobile first at 375px, from the existing section components and tokens; no sign-up form on it
  - [x] Kept out of search results (`robots: noindex`); the sitemap does not exist yet (step 1.6), so leave `/thank-you` out of it when it does; covered by the e2e specs on all projects
  - [x] Verified end to end on the preview 2026-11-08: sign-up, Kit double opt-in, confirmation email, link clicked, subscriber `active`. Setting the Kit form redirect to `/thank-you` needs the live domain: see [production_checklist.md](production_checklist.md), Part H
- [x] Tests: happy path, validation, enumeration safety, rate limit, bot rejection, Kit down then retried, webhook signature valid, invalid, expired and replayed (`tests/integration/test_subscribers.py`, `test_kit_job.py`, `test_kit_webhook_route.py`, `tests/test_kit_webhook.py` with Kit's own reference code as the oracle; the 1.3 API has 340 tests, 100% on its services)
- [x] Threat model updated (new third party holding subscriber email, new inbound webhook): K1 to K4, S3, R2, I2, D1, D3, T1 and the boundary table
#### 1.3 deployment and environment (2026-11-08)
Done:
- [x] PR #78 merged to `main` (2026-11-07); the production API is deployed with it
- [x] `wotw-api` variables re-entered per environment (database runtime password, Turnstile, Kit, service token, cron secret, IP salt) and the Neon and Vercel setup checked after production was restored from `preview-base` to carry the 1.3 migration (`471ab1c015c8`): production test data cleared, production and preview roles given separate passwords, production `/health/ready` ok, nightly backup role reset and the backup workflow green again. Step-by-step in [neon_vercel_checks.md](archive/neon_vercel_checks.md)
- [x] Preview sign-up works end to end (Turnstile, rate limit, database, outbox, Kit double opt-in)
- [x] Runbook: preview databases are not migrated automatically (`docs/runbooks/deploy.md`)

Left to do (this is the only list; the old `continue.md` is archived):
- [x] **(Hendrik)** Rotate the preview `app_migrator` password in Neon: it was pasted in chat on 2026-11-08 (the production one was reset). Done 2026-11-08 on `preview-base` and the PR branch
- [x] Recorded in ADR 0008 (2026-11-08): the webhook route decision, the background Kit call finishing after the response on Vercel (seen on the preview), and the Turnstile 110200 finding
- [x] Tests first, then fix: make the `unhandled_error` and `readiness_failed` logs name the cause class (never the message, which can hold hosts or credentials) so a database login failure is identifiable from the log. Finding it took many attempts because the log only said `DBAPIError`. Done: `cause_class()` in `app/core/errors.py` walks `__cause__` to the innermost exception; a wrong password now logs `error=DBAPIError cause=InvalidPasswordError`
- [x] Preview database upkeep (decided 2026-11-14: keep it manual; `migrate.yml` covers production only, at launch, see [production_checklist.md](production_checklist.md). Automating previews would put the DDL-capable `app_migrator` password in Preview build variables to save a rare step, and only two migrations exist, head `471ab1c015c8`. **Rule for any PR that adds a migration:** apply it to `preview-base` first, then check `select version_num from alembic_version;` on the PR's own preview branch and fix or delete that branch if it is behind; runbook in [deploy.md](runbooks/deploy.md)). A new preview branch is a copy of `preview-base` taken when Vercel first builds that git branch, and a copy keeps whatever passwords and schema `preview-base` had then (later changes to `preview-base` do not reach existing copies). So apply every migration and set the `app_runtime` password (equal to the Preview `DB_RUNTIME_PASSWORD`) on `preview-base` first; an open PR's branch that already exists must be fixed on its own (or deleted so Vercel recreates it from `preview-base`).
- [x] **(Hendrik)** In Neon: delete the restore backup branch `main_old_2026-11-08...` after a few days, if Neon allows it (it is the parent of `preview-base`, and Neon normally refuses to delete a branch that has children; if refused, leave it, it never runs and costs nothing), and stale preview branches (free plan limit 10; `neon-preview-cleanup.yml` removes a PR's branch when the PR closes, but redeploying an old preview can recreate it). Outcome 2026-11-14: Neon refused to delete `main_old_2026-11-08...` (it is the parent of `preview-base`), so it stays; it never runs and costs nothing. Stale `preview/...` branches: delete them only when the count nears the limit of 10 (see `docs/runbooks/deploy.md`)
- [x] Neon layout after the restore (2026-11-08), to keep in mind (reference only, nothing to do; confirmed 2026-11-14 that `main_old_...` cannot be deleted while it has `preview-base` as a child): `main_old_...` (root) is the parent of `preview-base` (the Default branch), which is the parent of `main` (production) and of every `preview/<git branch>`. Never use "Reset from parent" on `main` (its parent is `preview-base`, so it would overwrite production with preview data). Optionally make `main` the Default branch and re-parent the previews later; leave it until there is a reason
- [x] **(Hendrik)** In Kit: delete the test subscribers (`hendrik@`, `march@` and `hendrik+kit2@` at `thecodeblock.net`, and `test@wordonthewater.net`; Kit's API cannot delete subscribers) and the unused second form (`Newsletter site`, id 10158113)
- [x] Decide what to do with the untracked `apps/api/ip-header-migration.sql`, the deleted `mockup_site.pdf` and the two `docs/design/*@2x.png` files (left alone on purpose, not part of 1.3). Resolved 2026-11-14: `ip-header-migration.sql` was empty and is deleted; `mockup_site.pdf` was removed and the two `@2x.png` files committed as design references in PR #86
- [x] Local only: two backup tests fail because `pg_dump` is not installed (CI runs them); the local web and API servers need a restart to pick up the webhook route. Checked 2026-11-14: `libpq` is installed but `/opt/homebrew/opt/libpq/bin` is not on the PATH; with it on the PATH both backup tests pass. Done 2026-11-14: the PATH line is in `~/.zshrc` and both backup tests pass from a fresh shell. No local servers were running, so there is nothing to restart

### 1.4 Prayer request form (deferred past launch, decided 2026-11-14)
Not part of the launch. Until it is built the page has no prayer option at all (the Prayer link was removed from the menu bar, mobile menu and footer, and `prayer@` is no longer named on the page or in the privacy policy, 2026-11-15). Keep the steps below as the plan for later.
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
- [ ] Page UI (from the retired landing page checklist): a `#contact` section; the "Prayer" link added back to the menu bar (`nav-links.ts`) and the footer (`landing.ts`), both removed on 2026-11-15; fields first name (optional), message (required, 2,000 characters with a live counter) and an optional email for a reply; consent checkboxes "OK to email the prayer team" and "I would like a reply"; a plain note that the request is private and kept 90 days; a success message that does not repeat the prayer text; checked at 375px with the keyboard open, light and dark
- [ ] Name `prayer@wordonthewater.net` on the page and in the privacy policy again, and add the prayer and contact sections to `src/content/privacy.ts` (docs/privacy.md already describes them)
- [ ] **Postmark setup** (moved here from the launch checklist, because Kit sends every launch email): add `wordonthewater.net` in Postmark (Sender Signatures, Add Domain), copy its DKIM TXT and Return-Path CNAME (host like `pm-bounces`) into Squarespace DNS as custom records (host part only; never edit the Email Forwarding preset, never add a second SPF or `_dmarc` record), verify both in Postmark, set the from address to a `@wordonthewater.net` address, then send a test to a Gmail address and check in "Show original" that SPF passes, DKIM is signed as `d=wordonthewater.net` and DMARC passes (strict `p=reject`, `adkim=s`, `aspf=s`: anything that fails is rejected, not sent to spam), and that `prayer@` still forwards
- [ ] Smoke test once built (on the real domain): send a prayer request and check the prayer inbox receives it (the text only if the consent box was ticked), send a contact message and check it arrives in `hello@`
- [ ] Production variables on `wotw-api`: `EMAIL_FROM`, `PRAYER_INBOX=prayer@wordonthewater.net`, `CONTACT_INBOX=hello@wordonthewater.net`, `POSTMARK_SERVER_TOKEN` (Sensitive), `EMAIL_PROVIDER=postmark` and the prayer encryption key; Preview keeps test inboxes. Test a Postmark message to `hello@` and `prayer@` and confirm each arrives after forwarding (inbox, not spam); if forwarding proves unreliable, point `PRAYER_INBOX` and `CONTACT_INBOX` straight at the destination mailbox and keep `hello@` and `prayer@` as the public addresses

### 1.5 Contact form (deferred past launch, decided 2026-11-14)
Not part of the launch. Until it is built the page shows `hello@wordonthewater.net` as a mail link (this is also the Got Questions fallback). Keep the steps below as the plan for later.
- [ ] `POST /v1/contact` (202) with limits, Turnstile, honeypot, rate limit
- [ ] Notification via outbox to `hello@wordonthewater.net` (setting `CONTACT_INBOX`); `delete_after` 12 months
- [ ] Web form and tests: in the same section as the prayer form but clearly separated so people pick the right one; fields name, email, subject and message with limits; the same standards as sign-up (visible labels, `aria-live` errors, honeypot, Turnstile, works without JavaScript); success and error states
- [ ] Contact text kept out of logs and Sentry (test as in 1.4); threat model updated
- [ ] Add the Vercel Firewall rate-limit rules for the prayer and contact routes (the sign-up and chat rules are in production_checklist.md Part B)

### 1.6 Legal, SEO and trust
- [x] Privacy policy page (2026-11-14, `/privacy`, text in `src/content/privacy.ts`, written from docs/privacy.md): plain language and only what is true at launch (the weekly email and email sent to us; the Bible cookies only while the reader is on; no prayer or contact form and no Postmark yet). Linked from the footer on every page (a 44px target) and from the sign-up consent line, whose wording changed so every new sign-up records consent version `v2`; listed in the sitemap. Built; the responsible name (the registered name, Word On The Water) and the postal address (PO Box 6055, Port Elizabeth, Eastern Cape 6001, as Kit prints it) were supplied by the owner on 2026-11-14, so the policy has no placeholder left; `pnpm check:placeholders` now scans it too and still stops on the two social handles. **Open: (Hendrik) read the text once before launch.** When the prayer and contact forms are built, add their sections (privacy.md already describes them)
- [x] `/.well-known/security.txt` (2026-11-14, RFC 9116): `Contact: mailto:hello@wordonthewater.net`, `Canonical`, `Policy` (the repository's SECURITY.md), `Preferred-Languages: en`. `Expires` is worked out on each request, about 360 days ahead (rounded to the day), so it never goes stale and needs no yearly renewal; it is a per-request route for that reason
- [x] Real addresses on the page in place of the mockup placeholders: `hello@wordonthewater.net` for contact ("Talk to someone" when the chat is off, the privacy policy, `security.txt`; 2026-11-15). `prayer@` is not shown until the prayer form (1.4) is built, because the Prayer option was removed from the page
- [x] `generateMetadata`, canonical URLs, Open Graph image, JSON-LD `Organization` (2026-11-14). `src/lib/seo.ts` holds the site-wide metadata: `metadataBase` is `SITE_URL`, so canonical and image addresses are absolute; pages inherit the site name, website type, locale `en_GB` and a large Twitter card; the home page is its own canonical; a devotional keeps its canonical, article type and verse card. `src/app/opengraph-image.tsx` builds the default 1200 x 630 social image at build time (Night swell, the lighthouse crop `content/site/social/og-background.jpg`, the title) for the home page and any page without its own image; Twitter reuses it. The home page carries JSON-LD (`Organization` and `WebSite`). Left out on purpose until they exist: a `logo` (the icons arrive with the PWA, see PWA_checklist.md) and `sameAs` social profiles (the handles are placeholders)
- [x] `sitemap.ts` and `robots.ts` (2026-11-14): `robots` allows everything except `/api/` and names the sitemap; `sitemap` lists the home page and the devotionals a reader can open today, newest first, and awaits `connection()` so a devotional appears on its publish day with no redeploy (a code sitemap is otherwise cached at build time). `/thank-you` is left out. Both use `SITE_URL` (`src/lib/site.ts`, default `https://wordonthewater.net`, the same setting as the API; a Vercel preview uses its own address and the e2e server sets it to itself, because a link to another site is blocked by the CSP). The Bible pages are not listed yet (decision open)
- [ ] Footer: link to a full statement of faith once a page or URL exists (optional; the four points are on the page)
- [x] Moved to [production_checklist.md](production_checklist.md): the PWA conversion (manifest, icons, shortcuts, iOS settings, tests; the steps are in [PWA_checklist.md](PWA_checklist.md)) and enforcing the CSP in production

### 1.7 Retention and operations
- [x] Retention job (2026-11-14, `apps/api/app/jobs/retention.py`, called by `GET /cron/retention`): unconfirmed subscribers 7 days, prayer requests and contact messages at their `delete_after`, audit logs 1 year, and (added: the outbox keeps the recipient's address) sent outbox rows 7 days and failed ones 30. One transaction; counts only in the log. **Kit:** its API cannot delete a subscriber and unsubscribing an unconfirmed one would block a later sign-up, so unconfirmed Kit subscribers are deleted by hand in the Kit dashboard, a monthly task (privacy.md and the production checklist say so; the privacy notice used to say they were deleted from Kit)
- [x] Tests with time-shifted fixtures (`tests/integration/test_retention.py`, 10 tests against real Postgres: a row just inside and just outside every limit, pending outbox rows and active, unsubscribed and bounced subscribers never touched, idempotent, real clock when none is given); the endpoint, its logging and its auth are in `test_cron_retention.py`, `test_cron_auth.py` and `test_vercel_config.py`
- [x] Vercel Cron configured and verified (2026-11-14, **Hendrik**: both crons listed on the project's Cron Jobs page, a manual run and its log line checked, on Production, which is where crons run; the first scheduled run, 03:30 UTC the next day, is in the launch checklist). Configured: a second cron, `/cron/retention` at 03:30 UTC, beside the drain at 05:00 (Hobby: daily only; see runbooks/deploy.md). Crons run only on Production, so a preview can only be tried by hand with the cron secret and the protection bypass (the command is in runbooks/deploy.md)
- [x] Alerts: error rate, 5xx, failed email sends, DB connection failures, cert expiry. Code side done (2026-11-14): the drain cron now logs `outbox_messages_failed` and sends Sentry one scrubbed message when a message fails for good (before this nothing reported it; the outbox swallows delivery errors), and `/api/health` plus Sentry already cover 5xx and database failures. **Dashboards set up by Hendrik (2026-11-14)**, following [runbooks/alerts.md](runbooks/alerts.md): the uptime monitor, the Sentry alert rules and the SSL and domain reminders. Seeing each alert fire once stays in the launch checklist (Part J)
- [ ] **Later, after launch:** move the two crons to Vercel Schedules. Vercel's pages call Cron Jobs a legacy feature that "will be migrated to Schedules in the future" (no removal date, and the dashboard shows a banner). It is a configuration-only change in `apps/api/vercel.json`; the recipe, the cautions (remove `crons` in the same change or each route runs twice; `requestMethod: "GET"`) and the possible 15-minute drain on Hobby are in [runbooks/deploy.md](runbooks/deploy.md), Cron

### 1.8 Quality gates
- [x] Playwright e2e on iPhone SE/13, Pixel 7, desktop Chromium/WebKit/Firefox (all six projects run in CI, 27 spec files: navigation, sign-up, devotional, Bible, chat, theme, CSP, no-JS and more). Reworded 2026-11-16: the sign-up journey runs against a stub API, because Kit sends the double opt-in email, so Mailpit cannot see it (the real flow was proven by hand on a preview, 2026-11-08); the prayer form journey waits for step 1.4
- [x] `@axe-core/playwright` on every page: zero serious or critical (2026-11-15: landing, devotional and not-found in `a11y.spec.ts`; privacy, thank-you, sign-up, chat and the Bible reader in their own specs; light and dark)
- [x] Lighthouse CI mobile: Performance >= 95, Accessibility 100, Best Practices 100, SEO 100. Wired 2026-11-15 (`apps/web/lighthouserc.json`, `pnpm lighthouse`, CI job `lighthouse`, 3 runs, median, against the local production build). First reading: landing page 100 / 100 / 96 / 100, LCP 0.9 s, CLS 0, TBT about 20 ms. Best Practices is 96 locally only because `/_vercel/insights` 404s off Vercel (the gate uses 0.95; it must be 100 on a preview). **2026-11-16 (see [lcp_details.md](archive/lcp_details.md)):** the devotional's simulated LCP of 3.1 s is a bandwidth estimate of every request before the LCP (about 330 KB of fonts and scripts) and cannot be brought under 2.0 s without dropping most JS and fonts; not preloading Barlow cut the real LCP from 2.4 s to 1.6 s with no layout shift, and the config now uses real (devtools) throttling with the devotional asserts at `error` (both pages perf 0.99, LCP 1.63 s). Older notes: the devotional page scored 94 and a simulated LCP of 3.1 s (observed 135 ms); fetchpriority alone did not change it (tried 2026-11-15). Under real throttling (devtools method) the devotional's FCP is 1.75 s and LCP 2.4 to 2.8 s, so part of it is real; loading the art eagerly with `fetchpriority=high` gave about 2.4 s there and left the simulated figure at 3.1 s. The simulated gap is explained in [lcp_details.md](archive/lcp_details.md) (findings 10 and 11). **Measured on a deployed preview (PR #114, 2026-11-15, 3 runs each):** landing 100 / 100 / 100 / 69, FCP and LCP 0.98 s, CLS 0, TBT about 40 ms (SEO 69 is only Vercel's `x-robots-tag: noindex` on previews, check again on the live domain); devotional 94 to 98 / 97 / 100 / 69 with simulated LCP 2.4 to 3.1 s (observed 0.8 to 1.3 s), so the devotional LCP gap is real on Vercel too. The preview run also found a dark-mode contrast failure on the unpublished next-week card (opacity 0.55, 3.13:1), fixed with a dashed border and covered by a new axe case. **On CI (PR #116, 2026-11-16, devtools throttling, the reports are kept as the `lighthouse-reports` artifact):** devotional perf 0.99, LCP 1.62 to 1.63 s, CLS 0.0009; landing perf 0.97 to 0.99, with one run in three an outlier (LCP 1.95 s, TBT 123 ms) and another with CLS 0.073; the median passes. Looked at 2026-11-16: the slow run was a CPU stall on the runner (JS start-up 398 ms against 226 ms in the others, one 264 ms long task); the CLS run was `section#about` moving twice, both blamed on "Web font loaded", and could not be reproduced locally under the same throttling (12 of 12 runs at CLS 0.0002; delaying Barlow, Barlow Condensed or Lora by 1.5 s also gave no shift), so the cause is not yet known. Still to do: watch more CI runs (the landing outliers), check a preview again, make the job a required check **(Hendrik)**
- [x] LCP < 2.0 s, CLS < 0.05, INP < 200 ms, landing JS < 165 KB gzipped (budget revised in [ADR 0010](adr/0010-landing-js-budget.md), enforced by the e2e ceiling in `chat.spec.ts`). Evidence 2026-11-16: LCP 1.62 to 1.63 s and CLS about 0.001 (devotional, CI median; the landing page had one CI run of three at CLS 0.073 and one at LCP 1.95 s, see the Lighthouse line); INP measured in the lab with Playwright at 412 px and 4x CPU slowdown over the menu, theme toggle, chat open and typing in the sign-up field: worst interaction 56 ms (four runs); lab figures, real INP comes from Speed Insights after launch
- [ ] Re-measure LCP on a deployed preview because pages render per request (ADR 0007); revisit hash-based CSP if the budget fails
- [x] API service coverage >= 85% (CI, 2026-11-16: 99.75% on `services/`, the build fails below 85%, 589 API tests)
- [x] ZAP baseline scan: no high findings. Workflow `zap.yml` added 2026-11-16 (weekly, on demand and on a PR that changes it): scans a local production build, because staging needs Vercel Pro, and fails on any High finding; the report is kept as the `zap-reports` artifact. ZAP image pinned by digest. First local scan (2026-11-16): 0 High, 1 Medium (Absence of Anti-CSRF Tokens, low confidence, the sign-up form: Server Actions check the request origin instead of using form tokens), 4 Low or Info groups, 61 rules passed. Proven on GitHub (PR #117 run): 10 URLs, 7 alert groups, all Low or Info, no High or Medium (the Medium from the local run did not recur; spider coverage varies a little). Open: repeat against staging after the move to Pro (production_checklist.md)
- [ ] Manual pass: keyboard only, VoiceOver iOS, TalkBack
- [ ] Real device check on a mid-range Android phone
- [x] E2E stubs keep state per key, not one global slot, because the tests run fully parallel (the Kit webhook spec failed on CI that way; fixed in PR #92, 2026-11-14)
- [ ] `@playwright/test` is held at exactly 1.64.1: 1.65.0 ships Firefox 159, where four `desktop-firefox` tests crash with "Page crashed" (PR #90, 2026-11-14; the pin made them pass). `.github/dependabot.yml` ignores 1.65.x (added 2026-11-14). **Tried 1.65.1 on 2026-11-16 (draft PR #119, closed):** two `desktop-firefox` tests still crashed with "Page crashed" (`chat.spec.ts` fits the screen and `bible-popover.spec.ts` controls 44px; 965 passed, the other five projects green), so the pin and the ignore stay; try the next release after 1.65.1. When Dependabot proposes a later release and the e2e run passes, remove that entry and restore the caret range in `apps/web/package.json`; check the first Dependabot PR after this change to confirm the `1.65.x` syntax is honoured

### 1.9 Launch
Moved to [production_checklist.md](production_checklist.md): everything that needs the live `wordonthewater.net` domain or is only needed just before launch (Vercel Pro, DNS and email authentication, domain attach, Kit redirect and webhook, production configuration, smoke test).
- [x] Domain `wordonthewater.net` registered, with mailboxes `hello@` and `prayer@`

### 1.10 Got Questions chat (local knowledge base)
Step-by-step build checklist: [chat_checks.md](archive/chat_checks.md). Scope, mockups and decisions: [chat.md](archive/chat.md), [design/chat_mockups.html](design/chat_mockups.html), [ADR 0009](adr/0009-chat-local-knowledge-base.md). The "Talk to someone" button in Start here becomes "Got Questions" and opens a chat (drawer on desktop, full-height sheet on phones) answered from our own reviewed knowledge base, with follow-ups. No AI model, no web search, nothing stored on the server; history lives only in the visitor's tab. Behind `CHAT_ENABLED` (off by default). With 1.4 and 1.5 deferred, the chat is the main interactive feature after sign-up; its fallback and no-answer reply point to the `hello@` mail link, not a form.
- [x] Scope, mockups and ADR 0009 written; decisions recorded (2026-11-14): local knowledge base, no LLM in v1, history in `sessionStorage` only, audience mainly South Africa, the knowledge base text is original, `faith_kb (1).json` is the version to use
- [x] Prototype check (scratchpad only): keyword scoring finds the right entry first 96.2% and in the top three 99.6% of the time on the knowledge base's own 532 questions and paraphrases (optimistic: the words are in the index); off-topic questions need an "enough of the question's words matched" rule. `build_kb.py` rebuilt from `Christian_Faith_Knowledge_Base.md` gives JSON identical to `faith_kb (1).json`
- [x] Pastoral review is not a launch requirement (decided 2026-11-15); `SIGNOFF.md` removed
- [x] **K0** Bring the knowledge base into the repo: `apps/api/kb/` with the markdown source, `build_kb.py` (run with `uv run --with scikit-learn`, dev tool only) and the generated `faith_kb.json`; `make kb` and `make kb-check` (fails if the committed JSON is stale)
- [x] **K1** Load and validate (Pydantic models, ids resolve, no HTML, counts match `meta`); measure the cold start
- [x] **K2** Retrieval, strict TDD: index, scoring, confidence bands; the evaluation set as tests (own questions and paraphrases at least 95% first, off-topic to no answer, the weather and bread cases, "who is jesus")
- [x] **K3** Guards: personal details, crisis phrases, input normalisation; table-driven positive and negative cases
- [x] **K4** Chat logic: small talk, "more" and "why", context boost, seen-entry down-ranking, chips, contested note; 20 follow-up sequences
- [x] **K5** `POST /v1/chat/messages`: schema (`extra="forbid"`), service token, rate limit, honeypot and minimum time, integration tests, no message text in logs or Sentry (tested), OpenAPI types regenerated
- [x] **K6** Web panel: dialog, thread, chips, topic browser, `sessionStorage` history, Clear chat, 375px first, Vitest, lazy loaded; the button change in `landing.ts` and `start.tsx` behind `CHAT_ENABLED` with the contact link as the fallback
- [x] **K7** E2E on the six browser projects against a stub API, axe in both schemes, bundle size check, real phone and screen reader checks (done by hand, 2026-11-15)
- [ ] **K8** Threat model (C1 to C9 are drafted), privacy notice, runbook entry (update the knowledge base, kill switch), verify the SADAG and LifeLine numbers, then enable in Production **(Hendrik)** (launch steps: Part L of [production_checklist.md](production_checklist.md)) (docs, privacy notice, threat model, runbook and the number check are done 2026-11-15; the flag is set in Production (checked 2026-11-16); the walk-through remains)
- [x] Enhancements after testing on a phone (2026-11-15, details in [chat_checks.md](archive/chat_checks.md) under K6): Got Questions in the menu bar and mobile menu, a "Your chat" way back from the Bible reader (slim ink tab on the right edge of the passage heading on phones, from the version name down to the verses line, and a mid-height edge tab from `lg`) that opens the chat in place over the Bible, no site footer on the Bible reader pages, no question counts beside the topics, and "Talk to someone" is a mail link to `hello@` while the chat is off

- [x] Your chat on phones is the New A design (2026-11-16, branch `feat/chat-return-heading`, mockups New A to E in [design/chat_mockups.html](design/chat_mockups.html)): a 56px round button inside the pinned chapter bar between Previous and Next, with "Your chat" under it, and the bar's top line curving up around it (an SVG bump of the bar's own colours; the page keeps 1.8rem extra at the end for it). Before this it floated above the bar; a heading tab (New E) was built first and dropped after a phone test. From `lg` it is still the mid-height edge tab. Tests first: unit (round button and bump, the bar's slot) and e2e (geometry on three phone projects: between and clear of both buttons, 44px or more, the bump encloses it and meets the bar's line, neither chapter button covered, the credit clear of it at the end of a chapter, axe in both schemes)
- [x] Arrows on the Previous and Next chapter buttons (2026-11-16): the arrow never shrinks, the name is one line, the font scales from 12.5px to 16px with tighter padding. While the Your chat button is in the bar (a phone) the name uses its standard short form (`Book.short`: Matt, 1 Thess, Song, SBL style) so the arrows stay and no name is cut off; the link's accessible name is built from what is shown ("Previous chapter: Matt 15"). Measured on every book (second and second-last chapter) at 320, 360, 375, 390 and 412px, with and without the button: no name wraps, is empty or is cut off

- [x] Chat and image speed on Vercel (2026-11-17, branch `chat_performance`): measured on production, server work per chat turn is about 0.01 ms and a whole turn is 25 ms locally; the 2 s is serverless cold starts (the API function took 2.1 s after 8 minutes idle against 0.7 s warm; the web function the same) plus a 1.2 to 1.9 s image optimizer miss (0.25 s on a hit). Fixed so far: content images are `immutable` for a year and `images.minimumCacheTTL` matches (their URLs carry a content hash), and opening the chat sends one `warmChat` call that wakes the web function and the API (`GET /health/live`) while the visitor reads. Still to check on a preview; the lasting fix for cold starts is Vercel Pro

### 1.11 Landing page final review (from the retired landing page checklist)
Checked against the code and the tests on 2026-11-16: what is proven is ticked with its evidence; what needs a person, a real phone or a fix stays open. Two defects were found (marked **found**). Reading the copy is **(Hendrik)**.
- [x] Sign-up form, automated checks: the consent line beside a 44px button with the privacy link (unit), the pending state (`busy` disables the button and sets `aria-busy`, unit), the calm messages for 429, a refused spam check and a general error, announced in `role="alert"` and the success in `role="status"` (e2e), and axe clean with an error shown, in light and dark (e2e)
- [ ] Sign-up form on a real phone at 375px with the on-screen keyboard open, light and dark (no emulator shows the on-screen keyboard) **(Hendrik)**
- [x] **Found and fixed (PR #121, 2026-11-16): a field error is not announced and focus does not move to it.** A bad email returns only a field error (`parseSignup`, `src/lib/signup.ts`), shown in a plain `<p>` (`FieldError`) that is linked with `aria-describedby` and `aria-invalid` but is not a live region, and nothing moves focus to the first invalid field, so a screen reader user hears nothing after submitting a bad address (CLAUDE.md section 5 asks for `aria-live`). Done, test first: focus now moves to the first invalid field (`signup-form.tsx`), so a screen reader reads its label, its invalid state and the linked error together; a general error (429, spam check) keeps focus where it is and stays in `role="alert"`. Covered by three unit tests and an assertion in the sign-up e2e spec
- [x] Header links all land on a real section (`#about`, `#coming`, `#start`, `#believe` and the Subscribe button's `#subscribe` all exist); anchor targets are clear of the sticky header (`scroll-padding-top: 5rem` on `html`, e2e on About and What we believe); every interactive element has a 3px `:focus-visible` outline; smooth scroll is switched off by `prefers-reduced-motion` (`globals.css`; by code, no browser test)
- [x] The 404 page: status, heading and axe in light and dark (`a11y.spec.ts`, `shell.spec.ts`)
- [x] **Found and fixed (PR #121, 2026-11-16): the error page's "Try again" button failed contrast in the light theme.** `src/app/error.tsx` styles it by hand (`bg-accent text-bg`, 3.02:1, AA needs 4.5:1 at 16px; dark passes at 5.83:1) instead of using the shared `Button` (`accent-ink`, 4.95:1), and the page has no test. Done, test first: the page now uses the shared `Button`, with two unit tests (it is the shared primary button, and Try again calls `reset`). Not done: an axe check of the error page in a browser, because showing the error boundary needs a route that throws; the contrast rests on the shared button's measured colours instead
- [x] Devotional and body text: Lora at 17px with a 1.65 line height (`typography.spec.ts`) and the devotional article at `max-w-[62ch]`
- [ ] Each section compared with `docs/design/A. Night swell@2x.png` and `B. Dawn patrol@2x.png`; spacing, heading sizes and button styles consistent (a visual judgement, not automated) **(Hendrik)**
- [x] Text contrast in both schemes: axe reports no serious or critical problem on the landing page, a devotional, the 404, the privacy and thank-you pages, the sign-up band, the chat and the Bible reader, in light and dark (the error page's button is fixed, see above; the page itself has no browser axe test)
- [x] No sideways scroll at 320, 375, 414, 768, 820, 1024, 1280 and 1440 wide, light and dark, on the landing page, a devotional and the privacy page (measured 2026-11-16; the e2e overflow spec covers 320 to 414)
- [ ] Landscape on a phone, and the notch and home-indicator safe areas on a real iPhone **(Hendrik)**
- [x] Keyboard-only pass (measured 2026-11-16, phone and desktop, light and dark): the skip link is the first stop, every focus stop has a visible outline, and the menu, the theme toggle (works with Enter) and the sign-up fields are reachable
- [ ] Devotional pages: Article JSON-LD (only the home page has `Organization` and `WebSite` data) and the devotional archive page (also under 1.2b and 2.3)
- [ ] Optional later: add a point on the Holy Spirit or Jesus' return to the statement of faith

**Exit gate Phase 1**
- [ ] Steps 1.3, 1.6, 1.7, 1.8 and 1.11 above are ticked (1.4 and 1.5 are deferred past launch) and the 1.8 budgets are met
- [ ] Step 1.10 (Got Questions chat) is done, or consciously moved after launch with `CHAT_ENABLED` off and the button still a mail link to `hello@wordonthewater.net`
- [ ] [production_checklist.md](production_checklist.md) is complete (a visitor on a mid-range phone can read, subscribe and confirm and reach `hello@` (the forms are deferred and the page has no prayer option); DMARC reports reviewed after 2 weeks)

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
- [ ] Publishing a devotional creates a Kit broadcast (`POST /v4/broadcasts`) as a draft (`send_at` null): subject, preview text, rendered HTML content, internal description, subscriber filter by tag or segment. Progress 2026-11-14: `KitClient.create_broadcast` (API) and the web side are built and proven against the real Kit: `devotionalEmailHtml` renders a devotional in the dark Night swell look (series banner, scripture on raised panels, inline-styled quotes, ESV notice), `pnpm broadcast:devotional <folder> --tag <id>|--all` creates a draft only, and a real draft read back correctly. The weekly steps are in [devotional_format.md](devotional_format.md). Still to prove: a real test email of a devotional read on a phone, and delivery from `hello@` once Kit's DKIM is set
- [x] Spike first: confirm how a draft is scheduled (update with `send_at`), whether the chosen Kit template adds the unsubscribe link and address footer, and that sending is allowed on our Kit plan; otherwise put `{{ unsubscribe_url }}` and `{{ address }}` in our content. Done 2026-11-14, findings in [ADR 0008](adr/0008-kit-subscriptions.md): drafts work on the free plan, `PUT` with `send_at` schedules (and resets fields it does not carry), the Text only template adds the unsubscribe link and address itself, blockquotes need inline styles. Open: delivery from `hello@` needs Kit's DKIM first (Part E of [production_checklist.md](production_checklist.md))
- [ ] Send a test to Hendrik before scheduling; the editor schedules from our admin UI or from Kit. Proven 2026-11-14 with a tag-limited test broadcast (a tag only the test subscriber carries), sent from a Gmail sender because mail from `hello@` is very likely rejected until Kit's DKIM is set; a test from `hello@` is Part K of the production checklist
- [ ] Kit sends only to active subscribers and adds the unsubscribe link; bounces and complaints reach us through the Kit webhook (built in 1.3). The unsubscribe link and postal address footer are proven; the bounce and complaint path still needs a real delivery (Part K)
- [ ] Failed broadcast creation is visible in the admin UI and retried

### 2.5 Mobile app decision gate
- [ ] Revisit the native app (`docs/FLUTTER.md`, option B: keep this Next.js site and add a Flutter app for iOS and Android on the same FastAPI) once devotionals exist **(Hendrik)**
- [ ] Web Push for the weekly devotional is **planned after the PWA** (decided 2026-11-16): the design, the decisions and the steps W0 to W9 are in [web_push.md](web_push.md). It shares one service worker with the PWA's offline decision; iOS only works for sites added to the home screen (iOS 16.4 or later)

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

## Ideas for later (not planned)

From the retired chat documents; none is in scope until decided.
- Got Questions: a thumbs up or down per answer storing only an entry id (never text), a type-ahead list of suggested questions, verse references linked to the ESV once Crossway approves, WEB verse text shown inline, more knowledge base entries driven by the outcome counts and by questions emailed to `hello@`.
- An LLM that only rephrases the retrieved knowledge base entries (never searches the web) would reintroduce a third party and the privacy and injection risks: it needs its own ADR, a paid zero-retention model and a security review first.

## Ongoing (every phase)

- [ ] Review Dependabot PRs weekly; keep lockfiles committed
- [ ] Test backup restore quarterly
- [ ] Rotate secrets per runbook; review access and 2FA
- [ ] Review DMARC reports; tighten policy
- [ ] ZAP baseline weekly and before releases
- [ ] Update `CLAUDE.md`, ADRs, threat model and privacy doc whenever behaviour changes
- [ ] At each phase gate, and after any change to the area, re-check the Done threat items: calls without the service token or `CRON_SECRET` return 401 (S1, S4), a forged `X-Client-IP` is ignored (S2), the security workflows are green and Dependabot PRs reviewed (T4), `app_runtime` cannot run DDL (E1)

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
