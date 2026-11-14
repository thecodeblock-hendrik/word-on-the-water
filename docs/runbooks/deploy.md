# Deploy runbook

How Word on the Water is deployed on Vercel, and the one-off setup behind it.

## How the pieces fit

```
Browser
  |  HTTPS
  v
wotw-web (Next.js)          the only thing the browser talks to
  |  server to server: SERVICE_TOKEN + X-Client-IP (and the Vercel bypass secret)
  v
wotw-api (FastAPI)          validation, rules, rate limits, the email outbox
|         |         |         \
v         v         v          v
Neon      Upstash   Kit        Turnstile (verifies the token), Postmark (once set up)
Postgres  Redis     (list, double opt-in)
```

Two more ways into the API besides the web app:

- **Vercel Cron** calls `/cron/drain-outbox` with `Authorization: Bearer $CRON_SECRET`. It sends the queued emails and retries the Kit calls that failed.
- **Kit webhooks** cannot pass the API project's login wall, so Kit calls `wotw-web` at `/api/webhooks/kit`. That route passes the untouched body and `X-Kit-Signature` to `/v1/webhooks/kit` on the API and adds the bypass secret itself. The API checks the signature before it does anything.

Vercel does not proxy the data services. The Neon and Upstash integrations put environment variables (`NEON_*`, `UPSTASH_*`) into the API project, and the API connects to the addresses in them, so which database a deployment uses is decided only by the variables it receives. Neon and Redis never talk to each other.

| | Production (`main`) | Preview (each PR branch) |
|---|---|---|
| Web and API | `wotw-web`, `wotw-api` | a deployment of each per git branch (the web finds its API by swapping the project name in its alias, so keep branch names to 36 characters or fewer) |
| Neon | branch `main`, real data | branch `preview/<git branch>`, copied from `preview-base` when the git branch first builds |
| Redis | `wotw-redis` | its own separate Upstash database |
| Database passwords | the production roles on `main` | the roles and passwords set on `preview-base` |
| Kit | the real sign-up form | the test form |
| Turnstile | the production widget (works on `wordonthewater.net` only) | the preview widget (`localhost` and `vercel.app`) |

**Neon lineage** (since the restore on 2026-11-08): `main_old_...` (backup, root), then `preview-base` (the Default branch), then `main` (production) and every `preview/<git branch>`. `preview-base` is the data-free base that previews copy: it has the schema and its own passwords but no production data, so a preview never holds production data or a working production credential (threat model R-1 to R-3). A change to `preview-base` does not reach previews that already exist, which is why each migration is applied there first (see Migrations). Never use "Reset from parent" on `main`.

`/api/health` on the web app calls the API's `/health/ready`, which checks Neon and Redis, so `{"status":"ok"}` proves the whole chain for that deployment.

## Layout

| | `wotw-web` | `wotw-api` |
|---|---|---|
| Root directory | `apps/web` | `apps/api` |
| Framework | Next.js | FastAPI (entrypoint `app/main.py`, Python from `.python-version`, deps from `uv.lock`) |
| Region | `fra1` | `fra1` |
| Production URL | `wotw-web.vercel.app`; custom domain `wordonthewater.net` is a launch step (see [production_checklist.md](../production_checklist.md)); DNS stays at Squarespace and the old site is still live | `wotw-api.vercel.app` (stays on its protected URL) |
| Deployment Protection | Previews (Standard) | All deployments; the web passes the automation bypass |
| Data | none | Neon `wotw-db` (`NEON_*`), Upstash `wotw-redis` (`UPSTASH_*`) |

Team `thecodeblock`, Hobby plan. Vercel's Git integration deploys every push: a branch gets previews, `main` gets production.

**Ignored builds** (`ignoreCommand` in each `vercel.json`): a build is skipped when nothing under the app changed since `VERCEL_GIT_PREVIOUS_SHA`, the last successful deployment of the branch. A redeploy of the same commit (for example after changing env vars) always builds. If that commit is not in Vercel's clone (a squash-merge replaces the branch commits), `git diff` exits 128, which Vercel reports as a failed deployment; the command therefore ends with `|| exit 1` so anything but "no changes" builds. The API always builds previews, so every web preview has an API preview to call.

**Branches without deployments:** `git.deploymentEnabled` in each `vercel.json` turns off automatic deployments for `docs/**` branches (markdown only). Hobby allows 100 deployments per day per team, every PR push creates two (web and API), and builds skipped by `ignoreCommand` still count, so docs branches should not deploy at all. Such a PR gets no preview URL and no Neon branch; the required checks are all GitHub Actions, so merging is unaffected. To deploy a preview of a docs branch anyway, rename the branch.

**Preview wiring:** a web preview derives `API_BASE_URL` from `VERCEL_BRANCH_URL` (`wotw-web-git-<branch>-thecodeblock.vercel.app` becomes `wotw-api-git-…`). Production uses `API_BASE_URL=https://wotw-api.vercel.app`.

**Long branch names break the derivation.** The alias label is `wotw-web-git-<branch>-thecodeblock`, which must stay under 63 characters, so keep the branch name to 36 characters or fewer (Vercel drops `_` and turns `/` into `-`). Beyond that Vercel shortens the label and appends a hash that differs per project (observed on a Dependabot branch: web `…appswebno-0b4701-…`, API `…appswebno-5dfe3b-…`), so the swapped host does not exist. The web app now refuses to guess: `env.ts` throws "the branch name is too long" naming the alias. To use such a preview anyway, set `API_BASE_URL` for that branch to the API preview's real alias.

**Neon preview branches:** each preview gets a Neon branch `preview/<git branch>`, copied from `preview-base` (the Default branch) when the git branch first builds, and the Free plan allows 10. After production `main` was restored from `preview-base` (2026-11-08) the lineage is `main_old_...` (backup, root), `preview-base`, then `main` and the previews: never use "Reset from parent" on `main`. `.github/workflows/neon-preview-cleanup.yml` deletes it when the PR closes (secret `NEON_API_KEY` for Actions and Dependabot, variable `NEON_PROJECT_ID`). If previews fail with "Resource provisioning failed", check the branch count in the Neon console and delete stale `preview/...` branches (never `main`).

## Environment variables

Set for **Preview and Production only**. Development is empty: local work uses the root `.env` from `make setup`. Secrets are Sensitive (write-only), with separate values for Preview and Production.

| Project | Variable | Notes |
|---|---|---|
| api | `ENVIRONMENT` | `preview` or `production` (production disables `/docs`) |
| api | `DB_RUNTIME_PASSWORD` | `app_runtime` password. The URL is built from `NEON_PGHOST`, so each preview branch is used automatically |
| api | `SERVICE_TOKEN`, `CRON_SECRET`, `IP_HASH_SALT` | Random, 32 bytes hex |
| api | `TURNSTILE_SECRET_KEY` | The widget secret for the environment: Preview widget in Preview, Production widget in Production. A widget refuses any hostname not on its list (error 110200), so the Production widget works only on `wordonthewater.net` |
| api | `KIT_API_KEY`, `KIT_FORM_ID` | Preview uses the Kit test form; Production the real form |
| api | `KIT_WEBHOOK_SECRET` | Production only, set when the webhook is registered at launch ([kit_webhook_checks.md](../kit_webhook_checks.md)) |
| api | `EMAIL_PROVIDER` | Unset until Postmark is set up (step 1.x). Never `console` outside local: the factory refuses it, since it would log email contents |
| api | `NEON_*`, `UPSTASH_*` | Managed by the integrations; `REDIS_URL` falls back to `UPSTASH_REDIS_URL` |
| web | `SERVICE_TOKEN` | Same value as the API in the same environment |
| web | `API_BYPASS_SECRET` | The API project's automation bypass secret (not the web's own `VERCEL_AUTOMATION_BYPASS_SECRET`) |
| web | `API_BASE_URL` | Production only |
| web | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | The site key of the same widget (Preview widget in Preview, Production widget in Production); read at build time, so redeploy after changing it |

`DB_MIGRATOR_PASSWORD` is never given to the deployed API: the runtime has no DDL credentials.

## One-off: Neon roles

Run once on the Neon **main** branch, as the owner (`neondb_owner`). Branches copy roles and passwords from their parent when created, so production and preview must each end up with their own passwords (production on `main`, previews on `preview-base`); a preview branch that already exists does not follow later changes to `preview-base`.

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

`ENVIRONMENT` other than `local` turns on certificate and hostname verification. Production migrations move to `migrate.yml` with a manual approval (planned, a launch step). Run locally with `ENVIRONMENT=production`, the settings refuse Cloudflare's test Turnstile secret that sits in your `.env`: pass a non-test dummy for that one command, for example `TURNSTILE_SECRET_KEY=unused-by-migrations`. Run it from `apps/api` (Alembic imports `app` from the current directory).

**Preview databases are not migrated automatically.** Vercel creates a Neon branch per git branch, copied from `preview-base` when it is first created. A new migration therefore has to be applied to `preview-base` and to the branch of every open pull request that needs it, or the preview API fails with `DBAPIError` on the first query that touches the new schema. Check with `select version_num from alembic_version;` on the branch the preview uses.

## Cron

Two crons in `apps/api/vercel.json`, both sent with `Authorization: Bearer $CRON_SECRET`:

| Path | When | What |
|---|---|---|
| `/cron/retention` | daily 03:30 UTC | Deletes data past its retention period (docs/privacy.md); logs counts only |
| `/cron/drain-outbox` | daily 05:00 UTC | Sends queued emails and retries Kit calls; a message that fails for good logs `outbox_messages_failed` and sends Sentry one message |

Hobby only allows daily crons and limits how many an account may have (two when this was written; check Vercel's current limits before adding a third, which may need Pro); more frequent schedules fail the deploy. Change the drain to `*/5 * * * *` after moving to Pro. **Crons run only on the Production deployment**, never on previews. To try one on a preview, call it by hand with the cron secret and the Deployment Protection bypass (`curl -H "Authorization: Bearer $CRON_SECRET" -H "x-vercel-protection-bypass: $BYPASS" https://wotw-api-git-<branch>-thecodeblock.vercel.app/cron/retention`); the preview database is its own Neon branch, so this is safe. `tests/test_vercel_config.py` checks that each cron calls a route that exists and refuses an unauthenticated call.

## Checks after a deploy

```
vercel curl /api/health --deployment <web deployment URL>   # {"status":"ok"} means web, API, Neon and Upstash are all reachable
vercel logs --deployment <api deployment URL>                # readiness_failed names the failing dependency
```

Vercel Cron gets through Deployment Protection by itself: it calls the deployment-specific production URL (seen in the request logs). Check a run with `vercel crons run /cron/drain-outbox`, then `vercel logs` for `outbox_drained` (or `unhandled_error`). Request logs in the dashboard show the status code of every call.

`vercel curl` adds the protection bypass. The `x-vercel-id` response header shows the function region (for example `cpt1::fra1::…`).

## Rollback

Vercel Instant Rollback to the previous production deployment (`vercel rollback`). Safe because migrations are backward compatible.

## Kit webhook

Kit cannot pass the API project's Deployment Protection, so it calls the web project: `POST https://wordonthewater.net/api/webhooks/kit` forwards the raw body and `X-Kit-Signature` to `/v1/webhooks/kit` and adds the bypass secret server-side. Previews are behind the login wall too, so the webhook is registered for production only, at launch. Check the chain with `curl -i -X POST https://wordonthewater.net/api/webhooks/kit -d '{}'`: 503 means the forwarder reached the API but no `KIT_WEBHOOK_SECRET` is set; 401 means the secret is set and the unsigned call was refused; 502 means the API was unreachable. Steps: [kit_webhook_checks.md](../kit_webhook_checks.md).
