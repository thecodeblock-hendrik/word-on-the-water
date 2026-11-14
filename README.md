# Word on the Water

Christian ministry web app publishing devotionals and Bible teaching for men and surfers.

- Plan and progress (the one document to follow): [PLAN.md](docs/PLAN.md)
- Launch-time steps, kept apart until the site goes public: [production_checklist.md](docs/production_checklist.md)
- Architecture and rules: [CLAUDE.md](CLAUDE.md)
- Adding a devotional: [devotional format](docs/devotional_format.md). Landing page checklist: [landing_page_check.md](docs/landing_page_check.md)
- Decisions: [docs/adr](docs/adr). Security: [threat model](docs/threat-model.md), [privacy](docs/privacy.md), [SECURITY.md](SECURITY.md). Operations: [docs/runbooks](docs/runbooks)

## Status

Phase 0 (foundations) is complete. Phase 1 (the public landing page) is in progress and the site is **not public yet**: `wordonthewater.net` still points at the old Squarespace site. The planned launch date is **Saturday 28 November 2026**.

Built: the landing page with its real copy, light and dark themes, the devotional pages (four Advent devotionals, the first on the launch date), a Bible reader (BSB and WEB, behind a flag), and the email sign-up with Kit double opt-in (Turnstile, rate limits, retry from an outbox, `/thank-you`, and the Kit webhook route). The sign-up works end to end on a Vercel preview. The weekly email is built ahead as a draft command (`pnpm broadcast:devotional`): it renders a devotional as a dark email with the series banner and creates a Kit draft that you review and schedule in Kit; mail from `hello@` needs Kit's DKIM first (launch checklist, Parts E and K). Next: the prayer request form (1.4), the contact form (1.5), legal and SEO (1.6). The PWA and everything that needs the live domain are launch-time steps.

## Stack

- Web: Next.js 16, TypeScript, Tailwind CSS v4 (`apps/web`)
- API: FastAPI on Python 3.13, SQLAlchemy and Alembic (`apps/api`)
- Data: PostgreSQL 18 (Neon, one database branch per preview), Redis (Upstash)
- Email: Kit for subscriptions, Postmark for transactional mail
- Bot protection: Cloudflare Turnstile
- Hosting: Vercel (two projects, region `fra1`)

Vercel builds and deploys straight from the GitHub repo (no containers). Docker is used only locally for Postgres, Redis and Mailpit.

The browser only talks to Next.js, which calls FastAPI server-side with a service token. Kit's webhooks reach the API through a forwarder route on the web project (`/api/webhooks/kit`).

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
make kit-webhook URL=https://<site>/api/webhooks/kit   # register the Kit webhook (launch time)
make down        # stop services
```

In `apps/web`: `pnpm check:placeholders` and `pnpm check:devotionals` are the content gates, `pnpm build:bible` regenerates the Bible data, and `pnpm broadcast:devotional <folder> --tag <id>|--all` creates a Kit draft for the weekly email (never sends; steps in [devotional format](docs/devotional_format.md)).

Handy flags in the root `.env`: `DEVOTIONAL_TODAY=2026-12-12` previews a future day, `BIBLE_ENABLED=1` shows the Bible reader at `/bible` (plan in [docs/bible_feature.md](docs/bible_feature.md)), and `DEV_ORIGINS=<your Wi-Fi address>` lets a phone on the same network open `pnpm dev`. Do not `export` the first two in your shell: the unit tests read them and fail.
