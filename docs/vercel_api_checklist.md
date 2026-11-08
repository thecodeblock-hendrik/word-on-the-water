# Vercel API variables: start over (Preview and Production)

Re-enter every variable of the `wotw-api` project by hand. Work top to bottom and tick each box. Never paste a secret into chat, a file in the repo or a terminal command that is kept in history.

What we learned the hard way, so you do not repeat it:

- `vercel env ls` shows the **created** date, not the last edit. A saved edit still says "8d ago". Check edits in the Vercel dashboard, or ask Claude Code to read the API (it shows the real updated time).
- A changed variable only reaches a **new deployment**. Redeploy the deployment that the web project actually calls (see Part 7).
- The API builds its database login from `NEON_PGHOST` plus `DB_RUNTIME_PASSWORD` **without URL-encoding**. Use hex-only passwords (`openssl rand -hex 32`).
- The Neon preview-branching toggle is still a carry-over, so **all previews probably share one Neon branch** (`preview-base`). The `app_runtime` password must match on that branch.
- Production and Preview must never share a secret, database or Upstash instance.

---

## Part 0. Before you start

- [ ] Open your password manager. Every value below gets its own entry, labelled `wotw-api <variable> Preview` or `... Production`.
- [ ] Open Vercel, then the `wotw-api` project, then Settings, then Environment Variables. Keep it open next to this file.
- [ ] Decide the order: do **Preview first** and prove it works (Part 8), then Production.
- [ ] Generate a hex value when a step says "generate". In your terminal, run `openssl rand -hex 32` and copy the result straight into the password manager and Vercel. Run it again for the next value; never reuse one.

---

## Part 1. What stays and what you re-enter

**Do not touch these (the Neon and Upstash integrations manage them):**

- [ ] `NEON_*` (about 17 variables, including `NEON_PGHOST`, `NEON_PGHOST_UNPOOLED`, `NEON_PGDATABASE`). Check they exist for Production and Preview. Do not edit or delete them.
- [ ] `UPSTASH_REDIS_URL` and the other `UPSTASH_KV_*` variables. Check that Preview and Production each have their own (a different Upstash database for each).

**Re-enter these by hand (the API reads them):**

| Variable | Preview | Production | Notes |
|---|---|---|---|
| `ENVIRONMENT` | `preview` | `production` | exact words, plain (not secret) |
| `SERVICE_TOKEN` | generate | generate | must equal `SERVICE_TOKEN` in `wotw-web` for the same environment (Part 6) |
| `CRON_SECRET` | generate | generate | Vercel sends it to the cron route |
| `IP_HASH_SALT` | generate | generate | salt for hashed IP rate-limit keys |
| `DB_RUNTIME_PASSWORD` | generate | generate | must equal the `app_runtime` role password on the Neon branch (Part 5) |
| `TURNSTILE_SECRET_KEY` | Preview widget secret | Production widget secret | from Cloudflare, one widget each; never a test secret (`1x`, `2x`, `3x`) in Production |
| `KIT_API_KEY` | Kit key | Kit key | from Kit developer settings |
| `KIT_FORM_ID` | the test form id | the production form id | Preview must not use the production list |
| `SENTRY_DSN` | Sentry DSN | Sentry DSN | optional; blank disables reporting |

**Not yet (add later, listed in Part 9):** `KIT_WEBHOOK_SECRET`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `POSTMARK_SERVER_TOKEN`, `PRAYER_ENCRYPTION_KEY_ID`, `PRAYER_ENCRYPTION_KEY`.

`DB_MIGRATOR_PASSWORD` is **never** set on Vercel. Only you use it, from your terminal, to run migrations.

---

## Part 2. Collect what you need from other dashboards

- [ ] Cloudflare, Turnstile: the **Preview widget** secret key and the **Production widget** secret key. Production widget hostnames: `wordonthewater.net` and `www.wordonthewater.net`. Preview widget hostnames: `localhost` and `vercel.app`.
- [ ] Kit: the API key; the id of the **test** form (Preview) and of the **production** form.
- [ ] Sentry (optional): the API project DSN.
- [ ] Neon: confirm the branch names. Note which branch the **Preview** `NEON_PGHOST` points at (expected `preview-base`) and which is the production branch.

---

## Part 3. Remove the old custom variables (one environment at a time)

Start with Preview.

- [ ] In Environment Variables, filter by Preview. Delete only these if present: `ENVIRONMENT`, `SERVICE_TOKEN`, `CRON_SECRET`, `IP_HASH_SALT`, `DB_RUNTIME_PASSWORD`, `TURNSTILE_SECRET_KEY`, `KIT_API_KEY`, `KIT_FORM_ID`, `SENTRY_DSN`.
- [ ] Check no variable of the same name is left with a specific **git branch** attached. A branch-specific value overrides the general one and is easy to forget.
- [ ] Repeat for Production once Preview works. Do not delete Production variables until Preview is proven.

---

## Part 4. Add the variables

For every variable: click **Add Environment Variable**, enter the name, paste the value, tick **only** the environment you are working on, leave git branch empty, turn **Sensitive** on for every secret, and save.

### Preview

- [ ] `ENVIRONMENT` = `preview` (not sensitive)
- [ ] `SERVICE_TOKEN` = generated, Sensitive
- [ ] `CRON_SECRET` = generated, Sensitive
- [ ] `IP_HASH_SALT` = generated, Sensitive
- [ ] `DB_RUNTIME_PASSWORD` = generated hex, Sensitive. **Keep it; you set the same value on Neon in Part 5.**
- [ ] `TURNSTILE_SECRET_KEY` = the Preview widget secret, Sensitive
- [ ] `KIT_API_KEY` = Sensitive
- [ ] `KIT_FORM_ID` = the test form id
- [ ] `SENTRY_DSN` = Sensitive (or skip)

### Production (after Preview works)

- [ ] `ENVIRONMENT` = `production` (not sensitive)
- [ ] `SERVICE_TOKEN` = generated, Sensitive
- [ ] `CRON_SECRET` = generated, Sensitive
- [ ] `IP_HASH_SALT` = generated, Sensitive
- [ ] `DB_RUNTIME_PASSWORD` = generated hex, Sensitive
- [ ] `TURNSTILE_SECRET_KEY` = the Production widget secret, Sensitive
- [ ] `KIT_API_KEY` = Sensitive
- [ ] `KIT_FORM_ID` = the production form id
- [ ] `SENTRY_DSN` = Sensitive (or skip)

---

## Part 5. Make Neon agree with `DB_RUNTIME_PASSWORD`

The value in Vercel and the role password in Neon must be identical, on the branch the environment connects to.

### Preview

- [ ] In Neon, open the branch the **Preview** `NEON_PGHOST` points at (expected `preview-base`). Open its SQL editor.
- [ ] Run: `alter role app_runtime with password '<Preview DB_RUNTIME_PASSWORD>';`
- [ ] Run: `select version_num from alembic_version;` and expect `471ab1c015c8`. If it shows `45f20f111f39`, migrate this branch (direct host, role `app_migrator`, from `apps/api`: `uv run alembic upgrade head`).
- [ ] If a separate Neon branch exists for a pull request, repeat both steps there, or delete that branch so it is recreated from `preview-base`.

### Production

- [ ] In Neon, open the **production** branch SQL editor.
- [ ] Run: `alter role app_runtime with password '<Production DB_RUNTIME_PASSWORD>';`
- [ ] Run: `select version_num from alembic_version;` and expect `471ab1c015c8`. If not, migrate production first (the runbook in `docs/runbooks/deploy.md`; run from `apps/api` with `ENVIRONMENT=production` and a non-test `TURNSTILE_SECRET_KEY` set for that one command).
- [ ] Optionally rotate the `app_migrator` password on both branches and store the new ones in the password manager. Do this if either was ever pasted into chat.

---

## Part 6. Keep the web project in step

The web project calls the API with `SERVICE_TOKEN`. If you generated a new one, `wotw-web` must hold the **same** value for the same environment, or the API answers 401 and the form shows "Sign-up is not available right now".

- [ ] `wotw-web`, Preview: set `SERVICE_TOKEN` to the new Preview value from the password manager.
- [ ] `wotw-web`, Production: set `SERVICE_TOKEN` to the new Production value (later, with the Production step).
- [ ] Check `wotw-web` also still has `API_BYPASS_SECRET` (the API project's Vercel protection-bypass value) for Preview and Production, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Preview widget site key for Preview; Production widget site key for Production).

---

## Part 7. Redeploy the right deployments

A new value reaches only a new deployment.

- [ ] In Vercel, `wotw-api`, Deployments: find the **Preview** deployment whose branch is the one your web preview calls (for this PR, branch `feat/1.3-kit-signup`, alias `wotw-api-git-feat-13-kit-signup-...`). Do not redeploy the `main` one by mistake.
- [ ] Click the three dots, then **Redeploy**, and wait for Ready.
- [ ] Open the deployment and check the alias is the one the web preview uses.
- [ ] `wotw-web`: redeploy its matching Preview deployment too if you changed `SERVICE_TOKEN` or the Turnstile site key there.
- [ ] For Production: redeploy `wotw-api` Production, then `wotw-web` Production. This is a deliberate step for you (see `docs/runbooks/deploy.md`).

---

## Part 8. Prove Preview works before touching Production

- [ ] Open the web preview alias, scroll to the sign-up band, enter an address you can read, wait about five seconds, press Subscribe. Expect "Check your inbox".
- [ ] Tell Claude Code the address. Claude Code reads the API logs (expect a `202`, no `DBAPIError`) and checks Kit for an `inactive` subscriber on the test form.
- [ ] Click the confirmation link in the email. Claude Code checks Kit now shows `active`.
- [ ] The limiter allows 5 sign-ups an hour per IP and counts failed attempts. If you hit it, delete the `rl:` keys in the **Preview** Upstash database (not Production), or wait an hour.
- [ ] If the form fails, send Claude Code the time of your attempt. Do not guess; the log line names the failing step.

Only when this passes, repeat Parts 3 to 7 for Production.

---

## Part 9. Later (not part of this restart)

- [ ] **Kit webhook (end of step 1.3):** register it with `make kit-webhook URL=https://<api address>/v1/webhooks/kit`, then add `KIT_WEBHOOK_SECRET` to `wotw-api` (Sensitive; Production and Preview separately, never the production secret in Preview).
- [ ] **Transactional email (step 1.4 and 1.9):** `EMAIL_PROVIDER=postmark`, `EMAIL_FROM=Word on the Water <hello@wordonthewater.net>`, `POSTMARK_SERVER_TOKEN` (Sensitive), plus `PRAYER_INBOX` and `CONTACT_INBOX` when those steps add them. Until then the API defaults to a local SMTP host, which is fine because sign-up sends no mail.
- [ ] **Prayer encryption (step 1.4):** `PRAYER_ENCRYPTION_KEY_ID` and `PRAYER_ENCRYPTION_KEY`, separate for Preview and Production.
- [ ] **Neon preview branching toggle:** turn it on so each pull request gets its own branch, then Part 5 applies to each new branch (or keep one shared branch and leave it off).
- [ ] **Production domain:** `wordonthewater.net` still points at Squarespace. Attach it to the Vercel `wotw-web` project and move the DNS records before launch (step 1.9).

---

## Final check

- [ ] Every Part 1 variable exists for Preview and Production, Sensitive where it is a secret.
- [ ] No Production secret is also in Preview, and no Cloudflare test secret is in Production.
- [ ] Every value is saved in the password manager.
- [ ] Preview sign-up works end to end (Part 8).
- [ ] Production redeployed and tested after the production migration.
