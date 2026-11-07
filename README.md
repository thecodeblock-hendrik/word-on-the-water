# Word on the Water

Christian ministry web app publishing devotionals and Bible teaching for men and surfers.

- Plan and progress: [PLAN.md](docs/PLAN.md)
- Architecture and rules: [CLAUDE.md](CLAUDE.md)
- Adding a devotional: [devotional format](docs/devotional_format.md). Landing page checklist: [landing_page_check.md](docs/landing_page_check.md)
- Decisions: [docs/adr](docs/adr). Security: [threat model](docs/threat-model.md), [privacy](docs/privacy.md), [SECURITY.md](SECURITY.md). Operations: [docs/runbooks](docs/runbooks)

## Status

Phase 0 (foundations) is complete. Phase 1 (the public landing page) is in progress: the landing page with its real copy, light and dark themes, and the devotional pages (two Advent devotionals) are built. Sign-up, prayer and contact forms, the privacy page and SEO come next, so the site is not public yet.

## Stack

- Web: Next.js 16, TypeScript, Tailwind CSS v4 (`apps/web`)
- API: FastAPI on Python 3.13, SQLAlchemy and Alembic (`apps/api`)
- Data: PostgreSQL 18 (Neon), Redis (Upstash)
- Email: Kit for subscriptions, Postmark for transactional mail
- Hosting: Vercel (two projects, region `fra1`)

Vercel builds and deploys straight from the GitHub repo (no containers). Docker is used only locally for Postgres, Redis and Mailpit.

The browser only talks to Next.js, which calls FastAPI server-side with a service token.

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
make down        # stop services
```

In `apps/web`: `pnpm check:placeholders` and `pnpm check:devotionals` are the content gates, and `DEVOTIONAL_TODAY=2026-12-12 pnpm dev` previews a future day. `BIBLE_ENABLED=1 pnpm dev` shows the Bible reader at `/bible` (hidden by default; plan in [docs/bible_feature.md](docs/bible_feature.md)).
