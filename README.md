# Word on the Water

Christian ministry web app publishing devotionals and Bible teaching for surfers and anyone who feels the swell of life.

- Plan and progress (the one document to follow): [PLAN.md](docs/PLAN.md)
- Launch-time steps: [production_checklist.md](docs/production_checklist.md). Work decided for after the launch, in one list: [post_launch.md](docs/post_launch.md)
- Architecture and rules: [CLAUDE.md](CLAUDE.md)
- Adding a devotional: [devotional format](docs/devotional_format.md); the weekly Kit email: [kit_email_devotional.md](docs/kit_email_devotional.md). Landing page review: step 1.11 in [docs/PLAN.md](docs/PLAN.md)
- Decisions: [docs/adr](docs/adr). Security: [threat model](docs/threat-model.md), [privacy](docs/privacy.md), [SECURITY.md](SECURITY.md). Operations: [docs/runbooks](docs/runbooks)

## Status

Phase 0 (foundations) is complete. Phase 1 (the public landing page) is in progress and the site has been **live on `wordonthewater.net` since 2026-11-21** (Vercel Pro). The launch date is **Saturday 28 November 2026**, when the first devotional goes out; what is still open is listed in [docs/production_checklist.md](docs/production_checklist.md).

Built: the landing page with its real copy, light and dark themes, the devotional pages (five Advent devotionals, the first on the launch date), a Bible reader (BSB and WEB, switched on in Production), an installable PWA (icons, manifest, shortcuts, screenshots; no offline mode yet), and the email sign-up with Kit double opt-in (Turnstile, rate limits, retry from an outbox, `/thank-you`, and a daily sync of the Kit list into our database; Kit's webhooks need a paid plan, so none is registered). The sign-up works end to end on a Vercel preview. The weekly email is built ahead as a draft command (`pnpm broadcast:devotional`): it renders a devotional as a dark email with the series banner and creates a Kit draft that you review and schedule in Kit; Kit's DKIM is set and a test passed SPF, DKIM and DMARC (launch checklist, Parts E and K). The Got Questions chat (step 1.10) is built and tested behind `CHAT_ENABLED` (answers from a local knowledge base, nothing stored on the server); it is switched on in Production. Next: the manual passes in 1.8, the final landing page review (1.11) and the launch steps in `docs/production_checklist.md` (which now include the PWA install checks on the live domain and the first Kit draft test); the prayer request form (1.4) and contact form (1.5) come after launch, and the page has no prayer option until then. Everything that needs the live domain is a launch-time step.

## Stack

- Web: Next.js 16, TypeScript, Tailwind CSS v4 (`apps/web`)
- API: FastAPI on Python 3.13, SQLAlchemy and Alembic (`apps/api`)
- Data: PostgreSQL 18 (Neon, one database branch per preview), Redis (Upstash)
- Email: Kit for subscriptions, Postmark for transactional mail
- Bot protection: Cloudflare Turnstile
- Hosting: Vercel (two projects, region `fra1`)

Vercel builds and deploys straight from the GitHub repo (no containers). Docker is used only locally for Postgres, Redis and Mailpit.

The browser only talks to Next.js, which calls FastAPI server-side with a service token. Kit's list is mirrored into our database by a daily job (`/cron/sync-kit`); a webhook receiver exists (a forwarder route on the web project, `/api/webhooks/kit`) for a paid Kit plan but is not registered.

## Install on a phone

On Android Chrome, open the site and choose Install app. On iPhone, open it in Safari, tap Share, then Add to Home Screen.

## Quick start

Requires Docker, Node, pnpm and uv.

```
make setup   # write .env with random local secrets
make up      # start postgres, redis, mailpit
make migrate # apply database migrations
```

Run the apps:

```
cd apps/api && uv run uvicorn app.main:app
cd apps/web && pnpm dev
```

Mailpit UI: http://localhost:8025

## Commands

```
make lint        # ruff, eslint, prettier
make typecheck   # mypy, tsc
make test        # pytest, vitest
make e2e         # playwright, all browsers
make types       # regenerate API types
make kit-webhook URL=https://<site>/api/webhooks/kit   # register the Kit webhook (needs a paid Kit plan; not used at launch)
make down        # stop services
```

In `apps/web`: `pnpm make:icons` and `pnpm make:screenshots` rebuild the app icons and the manifest screenshots, `pnpm check:placeholders` and `pnpm check:devotionals` are the content gates, `pnpm build:bible` regenerates the Bible data, and `pnpm broadcast:devotional <folder> --tag <id>|--all` creates a Kit draft for the weekly email (never sends; steps in [devotional format](docs/devotional_format.md)).

Handy flags in the root `.env`: `DEVOTIONAL_TODAY=2026-12-12` previews a future day, `BIBLE_ENABLED=1` shows the Bible reader at `/bible` (plan in [docs/bible_feature.md](docs/bible_feature.md)), `CHAT_ENABLED=1` shows the Got Questions chat (see [docs/chat.md](docs/archive/chat.md) and the [runbook](docs/runbooks/chat.md)); start the API with it too, and `DEV_ORIGINS=<your Wi-Fi address>` lets a phone on the same network open `pnpm dev`. Do not `export` the first two in your shell: the unit tests read them and fail.
