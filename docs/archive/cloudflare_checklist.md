# Cloudflare R2 backup storage

Checklist for the nightly database dump (step 0.10, workflow to be written once this is done). Dumps go to a private Cloudflare R2 bucket, encrypted before upload, and expire after 30 days. Tick each box as you finish the step. Dashboards change often, so menu names may differ slightly.

Never paste a key, token or secret into chat or the repo. Secrets go in the password manager and in GitHub, nowhere else.

## Step 1: Account

- [x] Sign up at cloudflare.com (done) and verify your email.
- [x] Turn on two-factor login (also an E4 item in the threat plan).
- [x] Store the recovery codes offline.
- [x] Open **R2 Object Storage** in the dashboard and activate it. It may ask for a payment card; it only charges above the free allowance (10 GB, far more than we use).

## Step 2: Bucket

- [x] **Create bucket** named `wotw-db-backups`.
- [x] Location: **Europe (EEUR or WEUR)** to match the privacy notice.
- [x] Leave **Public access** off. Do not enable the `r2.dev` URL or a custom domain.
- [x] Note the **Account ID** (R2 overview page) in the password manager.

## Step 3: Expire old dumps after 30 days

- [x] Open the bucket, then **Settings, Object lifecycle rules, Add rule**.
- [x] Name: `expire-after-30-days`. Prefix: leave empty (all objects).
- [x] Action: **Delete objects** 30 days after they are created.
- [x] Save, and check the rule is listed as enabled.

## Step 4: API token for the workflow

- [x] **R2 Object Storage, Manage API tokens, Create API token**.
- [x] Permission: **Object Read & Write**.
- [x] Scope: **Apply to specific buckets only**, then `wotw-db-backups`.
- [x] No IP filter, no expiry needed (rotate yearly, see `docs/runbooks/rotate-secrets.md`).
- [x] Copy the **Access Key ID** and **Secret Access Key** into the password manager as "R2 backup token". The secret is shown once.

## Step 5: Encryption key for the dumps

Each dump is encrypted before it leaves GitHub, so the bucket alone cannot be read.

- [x] Install `age` (`brew install age`).
- [x] Generate a key pair: `age-keygen -o wotw-backup.key`.
- [x] Copy the **public key** (the line starting `age1...`, printed on screen and in the file).
- [x] Save the whole key file in the password manager as "age backup key". Without it the dumps cannot be restored.
- [x] Delete the local `wotw-backup.key` file after saving it. Never commit it.

## Step 6: Read-only database role

The dump should not use the owner or runtime password.

- [x] Ask Claude for the SQL, then run it in the Neon SQL Editor on the **main** branch: it creates a login role `app_backup` that can only read.
- [x] Save its password in the password manager as "Neon app_backup".
- [x] Note the **direct (unpooled)** host for the `main` branch from the Neon connection details.

## Step 7: GitHub secrets

In the repository, **Settings, Environments, New environment**, named `backup` (add yourself as the required reviewer if you want a manual approval before each manual run).

- [x] `R2_ACCOUNT_ID`
- [x] `R2_ACCESS_KEY_ID`
- [x] `R2_SECRET_ACCESS_KEY`
- [x] `R2_BUCKET` set to `wotw-db-backups`
- [x] `AGE_PUBLIC_KEY` (the `age1...` public key only, never the private key)
- [x] `BACKUP_DATABASE_URL` for the `app_backup` role on the direct Neon host of `main`, with `sslmode=verify-full`

## Step 8: Check and hand over

- [x] The bucket is private: its page shows no public URL.
- [x] The lifecycle rule is enabled.
- [x] The age private key is in the password manager and nowhere on disk.
- [x] Tell Claude the steps are done, so it can write the workflow, run it once, and rehearse a restore.

## Afterwards (Claude)

- [x] Nightly workflow written test-first and pinned to commit SHAs, using the `backup` environment.
- [x] First run succeeds: an encrypted dump appears in the bucket.
- [x] Restore rehearsed into a scratch Neon branch and recorded in `docs/runbooks/restore-db.md`.
- [x] `docs/privacy.md` updated: R2 as a processor, 30 day dump retention.
