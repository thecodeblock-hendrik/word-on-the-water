# Preview database isolation

Checklist for threat plan section 1 (R-1 to R-4, I7). Tick each box as you finish the step. The dashboards change often, so menu names may differ slightly.

 Keep the password manager open, and follow the order: step 1 must come first, and before step 1.3 collects any real data.

## Step 1: Data-free base branch for previews (R-1, R-2a)

**Neon console** (`wotw-db` project):

- [x] Go to **Branches**, then **Create branch**.
- [x] Name it `preview-base`, parent `main`, current data. `main` holds only the schema now.
- [x] Open `preview-base`, then the **SQL Editor** (or any Postgres client on that branch's connection string).
- [x] Generate three passwords (`openssl rand -base64 24`) and store them in the password manager as "preview-base".
- [x] Run `ALTER ROLE app_migrator PASSWORD '<new1>';`
- [x] Run `ALTER ROLE app_runtime PASSWORD '<new2>';`
- [x] In **Roles** on that branch, reset the `neondb_owner` password to `<new3>`.

**Vercel:**

- [x] Open **Storage**, the Neon database, **Settings**. Find the preview branching option ("Create database branch for deployment" or "Parent branch").
- [x] Set the parent branch for preview deployments to `preview-base`.
- [x] In `wotw-api`, **Settings, Environment Variables**: edit `DB_RUNTIME_PASSWORD` for **Preview only** and set it to `<new2>`. Leave Production unchanged.

Fallback if no parent can be chosen:

- [ ] Turn off per-preview branching for the project.
- [ ] Set the Preview `NEON_*` variables by hand to point at `preview-base` and mark them Sensitive. All previews then share one database, which is fine because it holds no real data.

## Step 2: Separate Upstash database for previews (R-3)

- [x] In Vercel, **Storage, Create Database, Upstash (Redis)**.
- [x] Name it `wotw-redis-preview`, region `eu-central-1` (Frankfurt, matches `fra1`).
- [x] Connect it to `wotw-api` for **Preview only**.
- [x] Open the existing `wotw-redis` connection to `wotw-api` and remove **Preview** from its environments, so it stays on Production only.
- [x] In `wotw-api` **Environment Variables**, check the `UPSTASH_*` variables now exist as separate Preview and Production entries.

## Step 3: Mark the `NEON_*` variables Sensitive (R-2b)

- [x] In `wotw-api` **Environment Variables**, edit each `NEON_*` variable and turn on **Sensitive** if offered.
- [x] Repeat in `wotw-web` if it has any `NEON_*` variables.
- [ ] If the integration refuses, note it here and move on: ____________

## Step 4: Rotate the production Neon credentials (R-2c)

Follow `docs/runbooks/rotate-secrets.md`.

- [x] Neon `main` branch, **Roles**: reset the `neondb_owner` password.
- [x] In the `main` **SQL Editor**: `ALTER ROLE app_runtime PASSWORD '<prod-new>';` and the same for `app_migrator`. Store them in the password manager as "production".
- [x] In `wotw-api`, edit `DB_RUNTIME_PASSWORD` for **Production only** to the new value.
- [x] Check the Production `NEON_*` variables changed after the owner reset.
- [x] Redeploy production: latest Production deployment, **Redeploy**, in `wotw-api` and `wotw-web`.

## Step 5: Verify

- [x] Push a small change on a branch of 36 characters or fewer to get a preview.
- [x] The web preview's `/api/health` returns `{"status":"ok"}`.
- [x] In Neon, the preview's branch shows `SELECT count(*) FROM subscribers;` as 0 (or test rows only). (R-1)
- [x] In Upstash, preview traffic shows in `wotw-redis-preview` and none in `wotw-redis`. (R-3)
- [x] In Vercel **Settings, Deployment Protection**, Preview is on Standard Protection for both projects. (I7)

## Afterwards

- [x] Tell me which steps worked, so it can tick R-1 to R-4 and I7 in `docs/threat_plan.md`, update the Status column in `docs/threat-model.md`, and restore the "previews never get production keys" rule in CLAUDE.md section 6.6.
