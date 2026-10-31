# Deploy runbook

How Word on the Water is deployed on Vercel, and the one-off setup behind it.

## Layout

| | `wotw-web` | `wotw-api` |
|---|---|---|
| Root directory | `apps/web` | `apps/api` |
| Framework | Next.js | FastAPI (entrypoint `app/main.py`, Python from `.python-version`, deps from `uv.lock`) |
| Region | `fra1` | `fra1` |
| Production URL | `wotw-web.vercel.app`; custom domain `wordonthewater.net` planned for launch (step 1.9); DNS stays at Squarespace | `wotw-api.vercel.app` (stays on its protected URL) |
| Deployment Protection | Previews (Standard) | All deployments; the web passes the automation bypass |
| Data | none | Neon `wotw-db` (`NEON_*`), Upstash `wotw-redis` (`UPSTASH_*`) |

Team `thecodeblock`, Hobby plan. Vercel's Git integration deploys every push: a branch gets previews, `main` gets production.

**Ignored builds** (`ignoreCommand` in each `vercel.json`): a build is skipped when nothing under the app changed since `VERCEL_GIT_PREVIOUS_SHA`, the last successful deployment of the branch. A redeploy of the same commit (for example after changing env vars) always builds. If that commit is not in Vercel's clone (a squash-merge replaces the branch commits), `git diff` exits 128, which Vercel reports as a failed deployment; the command therefore ends with `|| exit 1` so anything but "no changes" builds. The API always builds previews, so every web preview has an API preview to call.

**Branches without deployments:** `git.deploymentEnabled` in each `vercel.json` turns off automatic deployments for `docs/**` branches (markdown only). Hobby allows 100 deployments per day per team, every PR push creates two (web and API), and builds skipped by `ignoreCommand` still count, so docs branches should not deploy at all. Such a PR gets no preview URL and no Neon branch; the required checks are all GitHub Actions, so merging is unaffected. To deploy a preview of a docs branch anyway, rename the branch.

**Preview wiring:** a web preview derives `API_BASE_URL` from `VERCEL_BRANCH_URL` (`wotw-web-git-<branch>-thecodeblock.vercel.app` becomes `wotw-api-git-…`). Production uses `API_BASE_URL=https://wotw-api.vercel.app`.

**Long branch names break the derivation.** The alias label is `wotw-web-git-<branch>-thecodeblock`, which must stay under 63 characters, so keep the branch name to 36 characters or fewer (Vercel drops `_` and turns `/` into `-`). Beyond that Vercel shortens the label and appends a hash that differs per project (observed on a Dependabot branch: web `…appswebno-0b4701-…`, API `…appswebno-5dfe3b-…`), so the swapped host does not exist. The web app now refuses to guess: `env.ts` throws "the branch name is too long" naming the alias. To use such a preview anyway, set `API_BASE_URL` for that branch to the API preview's real alias.

**Neon preview branches:** each preview gets a Neon branch `preview/<git branch>`, and the Free plan allows 10. `.github/workflows/neon-preview-cleanup.yml` deletes it when the PR closes (secret `NEON_API_KEY` for Actions and Dependabot, variable `NEON_PROJECT_ID`). If previews fail with "Resource provisioning failed", check the branch count in the Neon console and delete stale `preview/...` branches (never `main`).

## Environment variables

Set for **Preview and Production only**. Development is empty: local work uses the root `.env` from `make setup`. Secrets are Sensitive (write-only), with separate values for Preview and Production.

| Project | Variable | Notes |
|---|---|---|
| api | `ENVIRONMENT` | `preview` or `production` (production disables `/docs`) |
| api | `DB_RUNTIME_PASSWORD` | `app_runtime` password. The URL is built from `NEON_PGHOST`, so each preview branch is used automatically |
| api | `SERVICE_TOKEN`, `CRON_SECRET`, `IP_HASH_SALT` | Random, 32 bytes hex |
| api | `EMAIL_PROVIDER` | Unset until Postmark is set up (step 1.x). Never `console` outside local: the factory refuses it, since it would log email contents |
| api | `NEON_*`, `UPSTASH_*` | Managed by the integrations; `REDIS_URL` falls back to `UPSTASH_REDIS_URL` |
| web | `SERVICE_TOKEN` | Same value as the API in the same environment |
| web | `API_BYPASS_SECRET` | The API project's automation bypass secret (not the web's own `VERCEL_AUTOMATION_BYPASS_SECRET`) |
| web | `API_BASE_URL` | Production only |

`DB_MIGRATOR_PASSWORD` is never given to the deployed API: the runtime has no DDL credentials.

## One-off: Neon roles

Run once on the Neon **main** branch, as the owner (`neondb_owner`). Preview branches copy roles from main.

```
openssl rand -hex 32   # once for the migrator, once for the runtime
psql "$NEON_DATABASE_URL_UNPOOLED" -v migrator_password=... -v runtime_password=... -f db/neon_roles.sql
```

Store both passwords in the team password manager. Set `DB_RUNTIME_PASSWORD` in `wotw-api` (Preview and Production, Sensitive). The migrator password is only used to run migrations.

## Migrations

Run as `app_migrator` against the **direct** (unpooled) host, before promoting app code that needs them. Migrations are backward compatible (expand, migrate, contract).

```
cd apps/api
DATABASE_URL_DIRECT="postgresql+asyncpg://app_migrator:<password>@<NEON_PGHOST_UNPOOLED>/neondb" \
ENVIRONMENT=production uv run alembic upgrade head
```

`ENVIRONMENT` other than `local` turns on certificate and hostname verification. Production migrations move to `migrate.yml` with a manual approval (planned).

## Cron

`/cron/drain-outbox` runs daily at 05:00 UTC: Hobby only allows daily crons, and more frequent schedules fail the deploy. Change it to `*/5 * * * *` after moving to Pro. Vercel sends `Authorization: Bearer $CRON_SECRET`.

## Checks after a deploy

```
vercel curl /api/health --deployment <web deployment URL>   # {"status":"ok"} means web, API, Neon and Upstash are all reachable
vercel logs --deployment <api deployment URL>                # readiness_failed names the failing dependency
```

Vercel Cron gets through Deployment Protection by itself: it calls the deployment-specific production URL (seen in the request logs). Check a run with `vercel crons run /cron/drain-outbox`, then `vercel logs` for `outbox_drained` (or `unhandled_error`). Request logs in the dashboard show the status code of every call.

`vercel curl` adds the protection bypass. The `x-vercel-id` response header shows the function region (for example `cpt1::fra1::…`).

## Rollback

Vercel Instant Rollback to the previous production deployment (`vercel rollback`). Safe because migrations are backward compatible.
