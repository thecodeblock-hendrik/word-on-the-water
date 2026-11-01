# Word on the Water

Christian ministry web app publishing devotionals and Bible teaching for men and surfers.

- Plan and progress: [PLAN.md](docs/PLAN.md)
- Architecture and rules: [CLAUDE.md](CLAUDE.md)
- Decisions: [docs/adr](docs/adr). Security: [threat model](docs/threat-model.md), [privacy](docs/privacy.md), [SECURITY.md](SECURITY.md). Operations: [docs/runbooks](docs/runbooks)

## Status

Phase 0 (foundations) is nearly complete: monorepo, API, database, email outbox, web shell with nonce CSP, generated API types, CI with branch protection, Vercel deployments, Sentry and analytics. Remaining: uptime monitor and nightly database dump. Phase 1 (the public landing page, sign-up and prayer forms) has not started, so there are no user-facing features yet.

## Stack

- Web: Next.js 16, TypeScript, Tailwind CSS v4 (`apps/web`)
- API: FastAPI on Python 3.13, SQLAlchemy and Alembic (`apps/api`)
- Data: PostgreSQL 17 (Neon), Redis (Upstash)
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
