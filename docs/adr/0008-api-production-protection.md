# 0008. Production API without Deployment Protection

Status: accepted

## Context
`CLAUDE.md` section 3 put the production API behind Vercel Deployment Protection (All Deployments), reachable only by the web project (bypass secret) and Vercel Cron.

Vercel Cron cannot get through that. It calls the production URL with no documented way to send the bypass header, and a protected deployment answers with a 302 redirect. Vercel's docs say a cron that receives a redirect "completes without further requests" and is not shown in the logs. In practice, after `vercel crons run /cron/drain-outbox` against the protected production API, the function logged nothing, although every run that reaches it logs `outbox_drained` (since #18). So the email outbox would never be drained.

Options considered:
- A. Standard Protection on the API: previews protected, the production URL public.
- B. Keep All Deployments and run the schedule from GitHub Actions with the bypass header and `CRON_SECRET`.
- C. Run the cron in the web project and have it call the API with the bypass secret.

## Decision
Option A. The production API relies on its own authentication, which it already enforces as if it were public (the BFF defence in depth):
- `/v1/*` requires the service token (default deny).
- `/cron/*` requires `CRON_SECRET`.
- `/health/live` and `/health/ready` return only `{"status": ...}`, with no details.
- `/docs` and `/openapi.json` are disabled in production.

Previews stay protected, and the web keeps sending the bypass secret so preview-to-preview calls work.

## Consequences
- The production API URL is reachable from the internet. Abuse is limited by the service token, rate limits and Vercel Firewall rules (step 1.8). A leaked service token now gives direct access, so rotation (`docs/runbooks/rotate-secrets.md`, step 0.10) matters more.
- The production cron can run (once a day on Hobby, every 5 minutes on Pro).
- B avoids the exposure but adds two GitHub secrets and a second scheduler; revisit it if the API gains endpoints that must never be public, or if abuse appears.
- Verify after the change: `vercel crons run /cron/drain-outbox` produces an `outbox_drained` log line.
