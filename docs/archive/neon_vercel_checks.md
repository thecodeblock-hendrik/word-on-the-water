> Archived 2026-11-08. All checks completed; the remaining launch items live in docs/PLAN.md, step 1.3.

# Neon and Vercel checks after restoring `main` from `preview-base`

Everything here is done in two places: the **Neon console** (console.neon.tech) and the **Vercel dashboard**. No terminal. One step needs GitHub (Part 3, backup secret); it is marked.

Situation: the production Neon branch (`main`) was restored from `preview-base` so the 1.3 migration was already in place. A restore replaces the target branch's tables, data **and roles with their passwords**, keeps the host, and normally leaves a backup branch (look for `main_old_...`) holding the previous production state.

Already verified from outside (2026-11-08, 09:05 UTC): production API `/health/ready` returned ok (database login and Redis work) and the production deployment is Ready. The nightly backup last ran at 07:29 UTC. Button names below may differ slightly from your screen; follow the intent.

Do the parts in order. Parts 1 and 2 first: the production cron runs at **05:00 UTC daily** with the real Kit key.

Never paste a password into chat. Neon shows a reset password only once: copy it straight into the password manager and Vercel.

---

## Part 0. Write down the facts (Neon)

- [x] Neon, project, **Branches**. Write down every branch name with its **Parent** and which one carries the **Default** badge:
  ______________________________________
- [x] Open the production branch (`main`), then the **Restore** or **History** view (the sidebar item may be called Operations or Backup and restore). Confirm the restore source was `preview-base`. Note the restore time (convert to UTC: South Africa is UTC+2): ______
- [x] Note the name of the backup branch the restore created (`main_old_...`): ______

---

## Part 1. Clean the data on `main` (Neon SQL Editor)

The restored `main` holds whatever `preview-base` held: test sign-ups, outbox rows, consent records. Production has no real sign-ups yet.

Open **SQL Editor** and use the branch selector at the top to pick **`main`**. Read the branch name before running every statement. Run each statement and tick it.

- [x] Version: `select version_num from alembic_version;` Expect `471ab1c015c8`. If it shows `45f20f111f39`, stop and tell Claude Code (production needs the migration before anything else).
- [x] Outbox: `select status, count(*) from email_outbox group by 1;`
- [x] Subscribers: `select count(*) from subscribers;`
- [x] Others: `select count(*) from prayer_requests;`, then `contact_messages`, then `audit_log`.
- [x] If any hold test data, clear them. Production has no real data yet:
  - [x] `delete from email_outbox;` (stops preview `kit_subscribe` jobs ever reaching the production Kit list)
  - [x] `delete from subscribers;`
  - [x] `delete from prayer_requests;`
  - [x] `delete from contact_messages;`
  - [x] `delete from audit_log;`
- [x] Re-run the counts and confirm each is `0`.

Optional (Neon **Schema Diff**, if your plan shows it): on the `main` branch page, compare `main` against `preview-base`. They should show no schema differences. This confirms the restore left both on the same schema.

---

## Part 2. Give production its own passwords (Neon, then Vercel)

After the restore, the production roles carry whatever `preview-base` had, so production and preview may share passwords. Reset them. You do not need to prove they match: resetting is the fix either way.

### 2a. Reset the roles on `main` (Neon)

- [x] Neon, branch `main`, **Roles & Databases** tab (or Roles). Confirm the roles exist: `app_runtime`, `app_migrator`, `app_backup`. Write down any that are missing: ______
- [x] Next to `app_runtime`, click **Reset password**. Copy the new password into the password manager as `wotw production app_runtime`. Neon shows it only once.
- [x] Do the same for `app_migrator` (`wotw production app_migrator`). It is only ever used by you for migrations, never put on Vercel.
- [x] Skip `app_backup` here; Part 3 handles it.

If the Reset password button is not available for a role, use the SQL Editor on `main`: `alter role app_runtime with password '<new hex>';` (generate a hex value with a password generator set to hex characters only, 64 characters, so it needs no URL-encoding).

### 2b. Update Vercel production

- [x] Vercel, project **wotw-api**, **Settings**, **Environment Variables**.
- [x] Find `DB_RUNTIME_PASSWORD` for **Production**. Edit it: paste the new `app_runtime` password, keep Sensitive on, save. Check there is no leading or trailing space.
- [x] If Neon's reset password contains special characters (`@ / : # ? %`), reset again until it is plain letters and digits, or use the hex route above. The API does not URL-encode it.
- [x] **Deployments** tab, filter to **Production**. Open the newest Ready deployment, three dots, **Redeploy**. Wait for Ready.
- [x] Prove it: open `https://<production API address>/health/ready` in your browser while you are logged in to Vercel (deployment protection lets you in). Expect `{"status":"ok"}`. If you see `{"error":{"code":"not_ready"...}}`, the new password did not reach the deployment: re-check the variable and redeploy again.
- [x] Also check **Logs** (wotw-api, Production) shows no `password authentication failed`.

Preview keeps its own passwords: do not reuse these values anywhere on Preview.

---

## Part 3. The backup role and the nightly backup

The workflow `backup.yml` connects as the read-only role `app_backup` using the GitHub secret `BACKUP_DATABASE_URL`. This is the one step that also needs GitHub.

- [x] Neon, `main`, Roles: `app_backup` is listed.
- [x] If missing, ask Claude Code to give you the exact `create role` statements from the runbook before continuing.
- [x] If it exists, reset its password (**Reset password**) and copy it into the password manager as `wotw production app_backup`.
- [x] **GitHub** (only here): repository, Settings, Secrets and variables, Actions, update `BACKUP_DATABASE_URL` with the new password (same direct host, role `app_backup`).
- [x] GitHub, Actions, **Database backup**, **Run workflow**, then confirm the run is green. (Claude Code can run and watch this for you if you prefer.)

---

## Part 4. Check the Neon and Vercel link

- [x] Neon, Branches: confirm `main` is the production branch you expect and `preview-base` is the parent for previews (Part 0 notes).
- [x] Neon, `main`, **Connect**, role `app_runtime`, pooled on: look at the host (starts `ep-` and ends `...neon.tech`, with `-pooler` in it). Write down its first 12 characters: ______
- [x] Neon, `main`, **Monitoring** (connections or queries over time): open the production API's `/health/ready` in the browser, then refresh Monitoring. A new connection or query on `main` confirms the production API really talks to this branch. If nothing appears, the production variable `NEON_PGHOST` points at another branch: tell Claude Code.
- [x] Vercel, **Storage** (or Integrations, Neon, Manage): note the Neon integration settings for the `wotw-api` project. Write down whether "database branch for each preview deployment" is on, and the parent branch: ______
- [x] Vercel, `wotw-api`, Environment Variables: confirm the `NEON_*` variables are still listed for Production and Preview. Do not edit them; the integration owns them.

---

## Part 5. Clean up Neon branches

- [x] Keep the backup branch (`main_old_...`) for a few days until Parts 1 to 3 are done and you are sure nothing in the old production state is needed, then delete it (Branches, three dots, Delete). It holds the old data and the old role passwords.
- [x] Delete stale per-PR preview branches (names like `preview/...`) you no longer need. The free plan allows 10 branches.

---

## Part 6. Fix Preview (the original sign-up problem)

This is not caused by the restore. The preview API must be able to log in to the Neon branch its deployment uses.

- [x] Vercel, `wotw-api`, **Deployments**, filter **Preview**: find the deployment for branch `feat/1.3-kit-signup`. Open it and look at its **Domains** or aliases: it should include `wotw-api-git-feat-13-kit-signup-...`. Write down the deployment name: ______
- [x] Neon, Branches: find the branch the integration created for that git branch (name like `preview/feat/1.3-kit-signup`), or use `preview-base` if previews share it. Open its **Roles & Databases** tab.
- [x] **Reset password** for `app_runtime` on that branch. Copy it into the password manager as `wotw preview app_runtime`. Use a different value from the production one in Part 2.
- [x] Vercel, `wotw-api`, Environment Variables, `DB_RUNTIME_PASSWORD` for **Preview**: paste that value, Sensitive, save.
- [x] Also run on that Neon branch, in the SQL Editor: `select version_num from alembic_version;` Expect `471ab1c015c8`. If it shows `45f20f111f39`, tell Claude Code.
- [x] Vercel, Deployments, **Preview**: open the `feat/1.3-kit-signup` deployment (not the `main` one), three dots, **Redeploy**. Check the new deployment holds the `...-git-feat-13-kit-signup-...` alias.
- [x] Submit the form on the web preview alias (`wotw-web-git-feat-13-kit-signup-...`) with an address you can read, and tell Claude Code so the logs can be read. If you see the 429 message, clear the preview limiter: Upstash (preview database only), delete keys starting `rl:`.

---

## Part 7. Final check

- [x] `main` data cleared and `alembic_version` is `471ab1c015c8`.
- [x] `app_runtime` and `app_migrator` on `main` have new passwords, different from Preview.
- [x] Production `/health/ready` ok after the redeploy, and Neon Monitoring on `main` shows the connection.
- [x] `app_backup` password updated and the GitHub backup run is green.
- [x] The backup branch from the restore is scheduled for deletion.
- [x] All new passwords stored only in the password manager.
