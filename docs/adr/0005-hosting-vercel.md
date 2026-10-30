# 0005. Hosting on Vercel

Status: accepted

## Context
One small team, low traffic at launch, and a wish for simple operations and per-PR previews.

## Decision
Two Vercel projects: `wotw-web` (Next.js, root `apps/web`) and `wotw-api` (FastAPI on the Python runtime, root `apps/api`), pinned to the same region as Neon. Neon and Upstash Redis come from the Marketplace. Vercel Cron drives the outbox drain and retention jobs and authenticates with `CRON_SECRET`. Vercel Firewall adds rate-limit rules. Hobby while building, Pro before public launch. The Cloudflare proxy is not placed in front of Vercel.

## Consequences
- No long-running processes or in-memory state; state lives in Postgres or Redis.
- Keep API cold starts small (lean dependencies, lazy imports, sensible `maxDuration`).
- Local development runs web and API natively with Docker only for data services.
- Region is chosen once the audience location is confirmed.
