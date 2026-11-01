# Restore the database

Neon hosts the database (`wotw-db`, `aws-eu-central-1`). Two recovery routes: Neon's point-in-time restore (available now) and a restore from a nightly dump (planned, step 0.10). **Neither has been rehearsed yet;** the first drill is part of step 1.9 and the result goes in the table at the end. Menu names below are from Neon's console and may have moved; check them before an emergency.

## When to restore

- Data was deleted or corrupted by a bug, a bad migration or a mistake.
- Not for a bad deploy on its own: roll the app back first (Vercel Instant Rollback). Migrations are backward compatible (expand, migrate, contract) so rolling the app back is safe.

## How far back can you go?

Neon keeps history for a limited window (the project's history retention): short on the Free plan, at least 7 days is the target on the paid plan (CLAUDE.md section 6.9). Check the window in the Neon console under the project's settings **before** you need it. Past the window, only the nightly dump helps.

## Route 1: point-in-time restore on the `main` branch

Safest order: look first, then decide.

1. **Stop writes if you can.** Production traffic keeps writing. For a bad migration or bad deploy, roll the app back first.
2. **Make a branch at the target time** (Neon console, Branches, create a branch from `main` at a past point in time). It does not touch production.
3. **Inspect it.** Connect with `psql` (unpooled host, as `neondb_owner`) and check the rows you expect: counts per table, the specific records, the latest `created_at`. Check `alembic_version` against the migration the deployed code expects.
4. **Restore `main` to that time** (Neon console, `main`, Restore). Neon keeps the pre-restore state as a backup branch; note its name. Connection strings stay the same.
5. **Verify** (below). Delete the inspection branch and, once sure, the backup branch.

## Route 2: from the nightly dump (planned)

Dumps come from a scheduled GitHub Actions workflow to separate encrypted storage (step 0.10, not built yet; storage and retention are open decisions, see `docs/privacy.md`).

1. Fetch the newest good dump and decrypt it.
2. Create a scratch Neon branch or a local Postgres 17 with `docker compose up`.
3. `pg_restore --no-owner --clean --if-exists -d <scratch url> <dump>`; run the checks below on the scratch copy.
4. Only then load into production, during a quiet period, as the owner role; run the migrations as the deploy runbook describes (as `app_migrator`, direct host) if the dump is older than the deployed schema.

## After any restore

1. **Schema matches the code:** `alembic current` against the restored database equals the deployed head. If you restored to before a migration, the deployed app may need rolling back or the migration re-running.
2. **Health:** `vercel curl /api/health --deployment <web deployment URL>` returns ok (see the deploy runbook).
3. **Data that should be gone may be back.** People who unsubscribed or asked for deletion since the restore point reappear. Re-apply every erasure request and unsubscribe from that period (Kit holds the unsubscribe state), and run the retention job so expired prayer requests, contact messages and unconfirmed subscribers go again.
4. **Mirror drift:** subscribers in Neon can disagree with Kit after a restore; Kit wins. Re-sync status from Kit.
5. **Outbox:** rows sent before the restore point may be pending again and would send twice. Check `email_outbox` for old pending rows and mark them failed.
6. Write down what happened in `docs/incidents/` and, if personal data was lost or exposed, follow the incident runbook.

## Drill log

Restore a copy quarterly (Ongoing tasks in PLAN.md): branch at a past time, check the expected rows, delete it.

| Date | Route | Result | Time taken |
|---|---|---|---|
| | | First drill due at step 1.9 | |
