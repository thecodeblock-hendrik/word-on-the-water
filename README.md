# Word on the Water

Christian ministry web app publishing devotionals and Bible teaching for men and surfers.

- Plan: [PLAN.md](PLAN.md)
- Architecture and rules: [CLAUDE.md](CLAUDE.md)

## Stack

Next.js (`apps/web`) calls FastAPI (`apps/api`) server-side. PostgreSQL, Redis and Mailpit run locally in Docker. Deployed on Vercel.

## Quick start

Requires Docker, Node, pnpm and uv.

```
make setup   # install deps, copy .env.example to .env
make up      # start postgres, redis, mailpit
```

Mailpit UI: http://localhost:8025
