# Rotate secrets

When to rotate: on a schedule (at least yearly), when someone with access leaves, and **immediately** when a secret may have leaked. The repository is public: a secret that was ever committed is compromised even after the commit is removed, so rotate it, do not just delete it.

Set new values in Vercel as **Sensitive** variables, separately for Preview and Production. Vercel applies a changed variable only to new deployments, so redeploy afterwards (a production redeploy is a dashboard action by the owner).

| Secret | Where it lives | How to rotate | What breaks while rotating |
|---|---|---|---|
| `SERVICE_TOKEN` | `wotw-api` and `wotw-web`, same value per environment | `openssl rand -hex 32`; set it in both projects for the environment; redeploy both | The API answers 401 to the web app until both run the new value. The API accepts one token, so do both back to back |
| `CRON_SECRET` | `wotw-api`; Vercel Cron sends it as a bearer | New value in `wotw-api`; redeploy | The next cron run fails until the redeploy finishes |
| `IP_HASH_SALT` | `wotw-api` | New random value; redeploy | Rate-limit counters restart. Harmless |
| `API_BYPASS_SECRET` | `wotw-web`; it is the API project's protection bypass secret | Regenerate the automation bypass in the `wotw-api` project settings, then update the variable in `wotw-web`; redeploy | Web calls to the API get the Vercel login page until both match |
| `DB_RUNTIME_PASSWORD` and the migrator password | `wotw-api` (runtime only; the migrator password is never on Vercel), the team password manager | In Neon, open the branch, Roles & Databases, **Reset password** (or `ALTER ROLE app_runtime PASSWORD '...'` in the SQL editor). Use a hex value (`openssl rand -hex 32`): the API puts it into the connection URL without URL-encoding. Then update the variable and redeploy the matching deployment. Production uses `main`. Previews have their own passwords and are copies of `preview-base`: rotate there first, then on any existing `preview/<branch>` branch (an existing copy does not follow `preview-base`). Never reuse a production password on a preview | The API cannot reach the database until the variable and the role match. Check with `/health/ready` (production) or a preview sign-up |
| `NEON_*`, `UPSTASH_*` | Managed by the Vercel integrations | Rotate in the Neon or Upstash console, or reconnect the integration; check what changed in Vercel; redeploy | The API loses the database or Redis until the redeploy |
| R2 backup token (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) | GitHub environment `backup`, password manager "R2 backup token" | Yearly. Cloudflare dashboard, R2, Manage API tokens: create a new Account token (Object Read & Write, `wotw-db-backups` only), replace both GitHub secrets, run the Database backup workflow once, then delete the old token | Nothing, if the workflow is not running during the swap |
| `app_backup` password (inside `BACKUP_DATABASE_URL`) | GitHub environment `backup`, password manager "Neon app_backup" | `ALTER ROLE app_backup PASSWORD '...'` on Neon `main` as the owner, then update `BACKUP_DATABASE_URL`; run the backup workflow once | The nightly backup fails until both match |
| age backup key (`AGE_PUBLIC_KEY`; private key in the password manager only) | Public key in GitHub environment `backup`; private key in password manager "age backup key" | Only if the private key may have leaked: `age-keygen` a new pair, replace `AGE_PUBLIC_KEY`, store the new private key. **Keep the old private key for 30 days**: dumps made before the swap can only be read with it. Delete it once they have expired | None |
| `NEON_API_KEY` | GitHub Actions and Dependabot secret | Create a new key in the Neon console, replace the GitHub secret, delete the old key | Preview branch cleanup fails until replaced |
| Kit API key | `wotw-api` | Create a new key in Kit developer settings, update the variable, redeploy, delete the old key | Sign-ups queue in the outbox and retry; none are lost |
| Kit webhook secret (Production only, set when the webhook is registered at launch) | `wotw-api` Production, shown by Kit once | Kit can rotate it with `POST /v4/webhook_endpoints/{id}/rotate_secret`; accept both signatures during the overlap, then revoke the old one | None, if both are accepted during the overlap |
| Postmark server token (planned) | `wotw-api` | New token in Postmark, update, redeploy, delete the old one | Notification mail queues in the outbox and retries |
| `PRAYER_ENCRYPTION_KEY` (planned, 1.4) | Vercel Sensitive variable, key id stored on each row | Add a new key under a new key id; new rows use it; re-encrypt old rows in the background; retire the old key only when no row references it. Never delete a key still referenced: those rows become unreadable | None, if the old key is kept until the re-encryption finishes |
| Turnstile secret (one per widget: Preview and Production) | `wotw-api` | New secret in the Cloudflare dashboard, update, redeploy | Form submissions fail the bot check until the redeploy |
| Account passwords and 2FA (Vercel, GitHub, Neon, Upstash, Kit, Postmark, Squarespace) | Password manager | Change the password, review the active sessions and tokens, check 2FA is on | None |

## After a suspected leak

1. Rotate the secret first, then investigate.
2. Look for use of the old value: Vercel logs for 401s from unexpected callers, the provider's access log (Neon, Kit, Postmark), Sentry once it exists.
3. If personal data could have been read, follow the incident runbook.
4. Write down what leaked, how, and what changed, in `docs/incidents/`.

## Checks

After rotating, run `vercel curl /api/health --deployment <web deployment URL>` (see the deploy runbook): `{"status":"ok"}` means the service token, the bypass secret, the database and Redis all work. Then check that the next cron run succeeds in the Vercel logs.

## Gotchas

- A changed variable only reaches a **new deployment**. Redeploy the deployment the web project really calls: for a preview, the one holding the `wotw-api-git-<branch>-...` alias, not the `main` one.
- `vercel env ls` shows the **created** date, not the last edit, so a saved edit still reads "8d ago". The Vercel dashboard (or the API) shows the updated time.
- When a database login fails, the API log only says `DBAPIError`; read the full log line with `vercel logs --scope <team> --project wotw-api --deployment <url>` to see `password authentication failed`.
