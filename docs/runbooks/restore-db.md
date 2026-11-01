# Restore the database

Neon hosts the database (`wotw-db`, `aws-eu-central-1`). Two recovery routes: Neon's point-in-time restore and a restore from the nightly encrypted dump in Cloudflare R2. **Neither has been rehearsed yet;** the first drill is part of step 1.9 and the result goes in the table at the end. Menu names below are from Neon's console and may have moved; check them before an emergency.

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

## Route 2: from the nightly dump

`.github/workflows/backup.yml` runs every night at 01:23 UTC (and on demand: Actions, Database backup, Run workflow). It dumps Neon `main` as the read-only `app_backup` role (`pg_dump --format=custom --no-owner --no-privileges`), encrypts the dump with age on the runner, and uploads it to the private R2 bucket `wotw-db-backups` (Western Europe) as `nightly/YYYY/MM/wotw-db-<UTC time>.dump.age`. A lifecycle rule deletes each dump 30 days after upload. A failed run shows a red cross in Actions and GitHub emails the owner.

What you need: the **age backup key** (password manager; without it no dump can be read), access to the Cloudflare dashboard, and `pg_restore` 17 or newer on your Mac (`brew install libpq`; it installs to `$(brew --prefix libpq)/bin`, which is not on the PATH by default).

Use this route when the point-in-time window has passed, or when Neon itself is unavailable.

1. **Download the dump.** Cloudflare dashboard, R2 Object Storage, `wotw-db-backups`, Objects, `nightly/`, the month, then the newest file before the problem started; Download.
2. **Make a scratch target.** Neon console, Branches, create a branch named `restore-drill` from `main` (the Free plan allows 10 branches; delete it afterwards). Then Databases, add a database `restore_drill` on that branch owned by `neondb_owner`. Copy the branch's **direct** connection string for `restore_drill` (Connect, connection pooling off) and keep it in your shell only:

   ```bash
   read -rs SCRATCH_URL   # paste the connection string, press Enter; nothing is shown
   export SCRATCH_URL
   ```

3. **Decrypt and restore in one pipe**, so the plaintext dump never lands on disk. Copy the whole age backup key from the password manager to the clipboard, then:

   ```bash
   PG="$(brew --prefix libpq)/bin"
   pbpaste | age --decrypt --identity - ~/Downloads/wotw-db-<time>.dump.age \
     | "$PG/pg_restore" --no-owner --no-privileges --exit-on-error --dbname "$SCRATCH_URL"
   pbcopy < /dev/null     # clear the clipboard
   ```

4. **Check the copy** (below, "Checks on a restored copy").
5. **Clean up:** delete the `restore-drill` branch in Neon, delete the downloaded file, `unset SCRATCH_URL`.
6. **For a real recovery,** only after the checks pass: load into production during a quiet period as the owner role, and run the migrations as the deploy runbook describes (as `app_migrator`, direct host) if the dump is older than the deployed schema. Then follow "After any restore".

### Checks on a restored copy

```bash
"$PG/psql" "$SCRATCH_URL" -c "select version_num from alembic_version" \
  -c "select relname, n_live_tup from pg_stat_user_tables order by relname"
```

- `alembic_version` equals the head the deployed code expects.
- Every application table is there (`audit_log`, `contact_messages`, `email_outbox`, `prayer_requests`, `subscribers`), with row counts close to production at the time of the dump. `n_live_tup` is an estimate; use `select count(*)` for an exact number.
- Prayer request bodies are still ciphertext: the dump holds them encrypted, and they are readable only with the application key.

## After any restore

1. **Schema matches the code:** `alembic current` against the restored database equals the deployed head. If you restored to before a migration, the deployed app may need rolling back or the migration re-running.
2. **Health:** `vercel curl /api/health --deployment <web deployment URL>` returns ok (see the deploy runbook).
3. **Data that should be gone may be back.** People who unsubscribed or asked for deletion since the restore point reappear. Re-apply every erasure request and unsubscribe from that period (Kit holds the unsubscribe state), and run the retention job so expired prayer requests, contact messages and unconfirmed subscribers go again.
4. **Mirror drift:** subscribers in Neon can disagree with Kit after a restore; Kit wins. Re-sync status from Kit.
5. **Outbox:** rows sent before the restore point may be pending again and would send twice. Check `email_outbox` for old pending rows and mark them failed.
6. Write down what happened in `docs/incidents/` and, if personal data was lost or exposed, follow the incident runbook.

## Drill log

Restore a copy quarterly (Ongoing tasks in PLAN.md), alternating the routes: route 1 (branch at a past time, check the expected rows, delete it) and route 2 (the steps above into `restore-drill`).

| Date | Route | Result | Time taken |
|---|---|---|---|
| | | First drill due at step 1.9 | |
