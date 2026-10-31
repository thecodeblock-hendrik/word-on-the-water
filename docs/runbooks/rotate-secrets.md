# Rotate secrets

When to rotate: on a schedule (at least yearly), when someone with access leaves, and **immediately** when a secret may have leaked. The repository is public: a secret that was ever committed is compromised even after the commit is removed, so rotate it, do not just delete it.

Set new values in Vercel as **Sensitive** variables, separately for Preview and Production. Vercel applies a changed variable only to new deployments, so redeploy afterwards (a production redeploy is a dashboard action by the owner).

| Secret | Where it lives | How to rotate | What breaks while rotating |
|---|---|---|---|
| `SERVICE_TOKEN` | `wotw-api` and `wotw-web`, same value per environment | `openssl rand -hex 32`; set it in both projects for the environment; redeploy both | The API answers 401 to the web app until both run the new value. The API accepts one token, so do both back to back |
| `CRON_SECRET` | `wotw-api`; Vercel Cron sends it as a bearer | New value in `wotw-api`; redeploy | The next cron run fails until the redeploy finishes |
| `IP_HASH_SALT` | `wotw-api` | New random value; redeploy | Rate-limit counters restart. Harmless |
| `API_BYPASS_SECRET` | `wotw-web`; it is the API project's protection bypass secret | Regenerate the automation bypass in the `wotw-api` project settings, then update the variable in `wotw-web`; redeploy | Web calls to the API get the Vercel login page until both match |
| `DB_RUNTIME_PASSWORD` and the migrator password | `wotw-api`, the team password manager | `ALTER ROLE app_runtime PASSWORD '...'` on the Neon **main** branch as the owner, then update the variable; redeploy. Preview branches copied the old password: see threat model R-2 | The API cannot reach the database until the variable and the role match |
| `NEON_*`, `UPSTASH_*` | Managed by the Vercel integrations | Rotate in the Neon or Upstash console, or reconnect the integration; check what changed in Vercel; redeploy | The API loses the database or Redis until the redeploy |
| `NEON_API_KEY` | GitHub Actions and Dependabot secret | Create a new key in the Neon console, replace the GitHub secret, delete the old key | Preview branch cleanup fails until replaced |
| Kit API key (planned, 1.3) | `wotw-api` | Create a new key in Kit developer settings, update the variable, redeploy, delete the old key | Sign-ups queue in the outbox and retry; none are lost |
| Kit webhook secret (planned, 1.3) | `wotw-api` | Kit can rotate it with `POST /v4/webhook_endpoints/{id}/rotate_secret`; accept both signatures during the overlap, then revoke the old one | None, if both are accepted during the overlap |
| Postmark server token (planned) | `wotw-api` | New token in Postmark, update, redeploy, delete the old one | Notification mail queues in the outbox and retries |
| `PRAYER_ENCRYPTION_KEY` (planned, 1.4) | Vercel Sensitive variable, key id stored on each row | Add a new key under a new key id; new rows use it; re-encrypt old rows in the background; retire the old key only when no row references it. Never delete a key still referenced: those rows become unreadable | None, if the old key is kept until the re-encryption finishes |
| Turnstile secret (planned) | `wotw-api` | New secret in the Cloudflare dashboard, update, redeploy | Form submissions fail the bot check until the redeploy |
| Account passwords and 2FA (Vercel, GitHub, Neon, Upstash, Kit, Postmark, Squarespace) | Password manager | Change the password, review the active sessions and tokens, check 2FA is on | None |

## After a suspected leak

1. Rotate the secret first, then investigate.
2. Look for use of the old value: Vercel logs for 401s from unexpected callers, the provider's access log (Neon, Kit, Postmark), Sentry once it exists.
3. If personal data could have been read, follow the incident runbook.
4. Write down what leaked, how, and what changed, in `docs/incidents/`.

## Checks

After rotating, run `vercel curl /api/health --deployment <web deployment URL>` (see the deploy runbook): `{"status":"ok"}` means the service token, the bypass secret, the database and Redis all work. Then check that the next cron run succeeds in the Vercel logs.
