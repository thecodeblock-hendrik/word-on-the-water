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
- **Kit webhooks** (not registered at launch: they need a paid Kit plan, and a daily sync stands in, see the cron table) cannot pass the API project's login wall, so Kit calls `wotw-web` at `/api/webhooks/kit`. That route passes the untouched body and `X-Kit-Signature` to `/v1/webhooks/kit` on the API and adds the bypass secret itself. The API checks the signature before it does anything.

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
| Fluid compute | on (checked 2026-11-17 from the project API) | on |
| Node | `engines.node` 24.x in `package.json`, which overrides the dashboard's 26.x ("Project Setting overridden by package.json"); matches CI and local | not used (Python) |
| Production URL | `wotw-web.vercel.app`; custom domain `wordonthewater.net` is a launch step (see [production_checklist.md](../production_checklist.md)); DNS stays at Squarespace and the old site is still live | `wotw-api.vercel.app` (stays on its protected URL) |
| Deployment Protection | Previews (Standard) | All deployments; the web passes the automation bypass |
| Data | none | Neon `wotw-db` (`NEON_*`), Upstash `wotw-redis` (`UPSTASH_*`) |

Team `thecodeblock`, Hobby plan. Vercel's Git integration deploys every push: a branch gets previews, `main` gets production.

**Speed on Hobby (measured 2026-11-17).** Both functions scale to zero when idle, so the first request after about 8 minutes takes about 2 s (API 2.1 s cold against 0.7 s warm; the web function the same), and one more round trip from South Africa to `fra1` adds a few hundred ms. Fluid compute is already on. **On Pro (measured 2026-11-21)** there is no separate Cold Start Prevention toggle: it is built into Fluid Compute and enabled on both projects, the first web request after 15 minutes idle took 0.95 s against 0.28 s warm, and the API stays warm because the 5-minute outbox cron calls it (production_checklist.md, Part B). Two code-side measures are in place: opening the chat sends one `warmChat` call that wakes the web function and the API behind it, and content images are served `immutable` for a year with `images.minimumCacheTTL` to match (their addresses carry a content hash), because an optimizer cache miss cost 1.2 to 1.9 s against 0.25 s on a hit. To measure again: `vercel curl /health/live --deployment <api url>` for the API and `vercel curl /api/health --deployment <web url>` for both (the project IDs are in `apps/*/.vercel/project.json`; `vercel api /v9/projects/<id>` shows `resourceConfig.fluid`).

**Ignored builds** (`ignoreCommand` in each `vercel.json`): a build is skipped when nothing under the app changed since `VERCEL_GIT_PREVIOUS_SHA`, the last successful deployment of the branch. A redeploy of the same commit (for example after changing env vars) always builds. If that commit is not in Vercel's clone (a squash-merge replaces the branch commits), `git diff` exits 128, which Vercel reports as a failed deployment; the command therefore ends with `|| exit 1` so anything but "no changes" builds. The API always builds previews, so every web preview has an API preview to call.

**Branches without deployments:** `git.deploymentEnabled` in each `vercel.json` turns off automatic deployments for `docs/**` branches (markdown only). Hobby allows 100 deployments per day per team, every PR push creates two (web and API), and builds skipped by `ignoreCommand` still count, so docs branches should not deploy at all. Such a PR gets no preview URL and no Neon branch; the required checks are all GitHub Actions, so merging is unaffected. To deploy a preview of a docs branch anyway, rename the branch.

**Preview wiring:** a web preview derives `API_BASE_URL` from `VERCEL_BRANCH_URL` (`wotw-web-git-<branch>-thecodeblock.vercel.app` becomes `wotw-api-git-…`). Production uses `API_BASE_URL=https://wotw-api.vercel.app`.

**`SITE_URL` follows the deployment.** Next makes a page's `rel="prev"`, `rel="next"` and image links absolute from the site address, and the CSP (`default-src 'self'`) blocks a link to another site (Firefox prefetches `rel="next"`, so it showed up there first). So `apps/web/src/lib/site.ts` resolves the address as: `SITE_URL` if set, else a Vercel preview's own `VERCEL_URL`, else `https://wordonthewater.net`; the Playwright test server sets `SITE_URL` to itself. A deployment that serves from a different address than its `SITE_URL` shows CSP errors in the console, not a visible fault.

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
| api | `KIT_WEBHOOK_SECRET` | Production only; not set at launch (Kit's webhooks need a paid plan), set when a webhook is registered ([production_checklist.md](../production_checklist.md), Part H) |
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

Three crons in `apps/api/vercel.json`, both sent with `Authorization: Bearer $CRON_SECRET`:

| Path | When | What |
|---|---|---|
| `/cron/sync-kit` | daily 03:00 UTC | Reads every subscriber's state from Kit and updates our mirror (stands in for the Kit webhook, which needs a paid plan); runs before retention so confirmed people are active and survive it; logs counts only (`kit_synced`) |
| `/cron/retention` | daily 03:30 UTC | Deletes data past its retention period (docs/privacy.md); logs counts only |
| `/cron/drain-outbox` | every 5 minutes | Sends queued emails and retries Kit calls; a message that fails for good logs `outbox_messages_failed` and sends Sentry one message |

The drain runs every 5 minutes (changed on the move to Pro, 2026-11-21); on Hobby a cron may run only once a day and a more frequent one fails the deploy, and the retention cron stays daily. Each project may have 100 crons on every plan. **Crons run only on the Production deployment**, never on previews. To try one on a preview, call it by hand with the cron secret and the Deployment Protection bypass (`curl -H "Authorization: Bearer $CRON_SECRET" -H "x-vercel-protection-bypass: $BYPASS" https://wotw-api-git-<branch>-thecodeblock.vercel.app/cron/retention`); the preview database is its own Neon branch, so this is safe. `tests/test_vercel_config.py` checks that each cron calls a route that exists and refuses an unauthenticated call.

**Cron Jobs are a legacy feature (noted 2026-11-14).** Vercel's pages say they "will be migrated to Schedules in the future", with no removal date, and the dashboard shows a banner saying so. Nothing has to change yet. When we move (after launch, not before 28 November), it is a configuration change in `apps/api/vercel.json` and the routes stay as they are:

```json
"schedules": {
  "retention":    { "schedule": "30 3 * * *", "path": "/cron/retention",    "requestMethod": "GET" },
  "drain-outbox": { "schedule": "*/5 * * * *", "path": "/cron/drain-outbox", "requestMethod": "GET" }
}
```

- Remove the `crons` entries in the same change, or each route runs twice per occurrence.
- `"requestMethod": "GET"` is required: schedules send POST by default and our routes are GET.
- The `Authorization: Bearer $CRON_SECRET` header is unchanged, so `require_cron_secret` keeps working. Leave out `timezone` and the times stay UTC.
- Vercel creates the schedules when the deployment becomes the production one. Test with the dashboard's Run Schedule or `vercel schedules invoke <name>`. "Disable Cron Jobs" no longer affects them; use the Schedules Disable action.
- A possible gain on Hobby: Schedules may run as often as every 15 minutes (within a 15-minute jitter window), where Cron Jobs run once a day. That would let the outbox drain retry a failed email within the hour before Pro; check the Schedules limits page first, which I have not read.

Sources: [migrate from Cron Jobs](https://vercel.com/docs/schedules/migrate-from-cron-jobs), [Cron Jobs usage and pricing](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing) and [the January 2026 limits change](https://vercel.com/changelog/cron-jobs-now-support-100-per-project-on-every-plan).

## Firewall rules (`wotw-web`)

Two rate-limit rules on the web project, set up by Hendrik on 2026-11-21 (Vercel, `wotw-web`, Firewall, Configure, published with Review Changes and Publish; they take effect at once, with no redeploy). They guard the public site only: the API's own address is behind the login wall and only the web app calls it. Sign-up, chat and the theme toggle are Next.js Server Actions, so the browser posts to the page URL and the rules match on **Server Action Name** (the function names in `apps/web/src/lib/actions`), not on a path. The numbers are deliberately looser than the API's own limits (5 sign-ups an hour per address and 3 per email, 30 chat messages per 10 minutes), so a real visitor reaches the API's friendly generic 429 before Vercel's.

| Rule | If | Limit | Action |
|---|---|---|---|
| Rate limit sign-up | Server Action Name equals `subscribe` | Fixed window, 10 minutes, 10 requests, key IP | Log first, then Too Many Requests (429) |
| Rate limit chat | Server Action Name is any of `sendChat`, `warmChat` (`warmChat` fires each time the chat is opened) | Fixed window, 1 minute, 40 requests, key IP | Log first, then Too Many Requests (429) |

- Both rules start on **Log**, which blocks nothing. After about a day of real traffic, check the Firewall traffic view for anything legitimate that was caught, then edit each rule to 429 and publish again. The date of the switch goes in production_checklist.md, Part J.
- If a rule ever needs to be rebuilt and the dashboard does not offer Server Action Name, use one rule on Method equals POST and the Request Header `next-action` exists, 30 requests a minute per IP (sign-up and chat then share one limit).
- Rate limiting is included on Pro and billed by usage; Pro allows 40 rules per project, and rate-limit rules count toward that number.
- In an attack, Attack Challenge Mode is the emergency switch (see [incident.md](incident.md)); it is not part of these two rules.
- The prayer and contact forms, when they are built, need their own rule (their Server Action names).

## Checks after a deploy

```
vercel curl /api/health --deployment <web deployment URL>   # {"status":"ok"} means web, API, Neon and Upstash are all reachable
vercel logs --deployment <api deployment URL>                # readiness_failed names the failing dependency
```

Vercel Cron gets through Deployment Protection by itself: it calls the deployment-specific production URL (seen in the request logs). Check a run with `vercel crons run /cron/drain-outbox`, then `vercel logs` for `outbox_drained` (or `unhandled_error`). Request logs in the dashboard show the status code of every call.

`vercel curl` adds the protection bypass. The `x-vercel-id` response header shows the function region (for example `cpt1::fra1::…`).

## Rollback

Vercel Instant Rollback to the previous production deployment (`vercel rollback`). Going forward is manual too: production auto-promotion is off in both projects, so a merge to `main` builds a production deployment that is not served until it is promoted (dashboard, Deployments, Promote to Production, or `vercel promote <url>`). Check `vercel inspect wotw-api.vercel.app` to see which build is live. Crons run only on the promoted deployment. Safe because migrations are backward compatible.

## Kit webhook (not registered at launch)

Kit's webhook endpoints need a paid plan, so none is registered while we are on the free plan; the daily `/cron/sync-kit` keeps the subscriber mirror right instead (ADR 0008). The notes below apply if a webhook is registered later.

Kit cannot pass the API project's Deployment Protection, so it calls the web project: `POST https://wordonthewater.net/api/webhooks/kit` forwards the raw body and `X-Kit-Signature` to `/v1/webhooks/kit` and adds the bypass secret server-side. Previews are behind the login wall too, so the webhook is registered for production only, at launch. Check the chain with `curl -i -X POST https://wordonthewater.net/api/webhooks/kit -d '{}'`: 503 means the forwarder reached the API but no `KIT_WEBHOOK_SECRET` is set; 401 means the secret is set and the unsigned call was refused; 502 means the API was unreachable. Steps: [production_checklist.md](../production_checklist.md), Parts G and H.
