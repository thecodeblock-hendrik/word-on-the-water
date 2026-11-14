# Alerts runbook

What tells the owner that something is wrong, where each signal comes from, and how to set up the alert. The code produces the signals; the alerts themselves are switched on in each tool's dashboard (**Hendrik**), because they need an account and an address to notify. Tick the boxes in [production_checklist.md](../production_checklist.md) as you go.

## The alerts

| Alert | The signal | Where it comes from | Set up |
|---|---|---|---|
| The site or API is down, or returns errors | `/api/health` answers 503 (it asks the API, which asks Neon and Redis) | An uptime monitor (Better Stack or UptimeRobot) checking `https://wordonthewater.net/api/health` every 5 minutes | Email on 2 failed checks in a row |
| A request crashed (5xx) | Sentry issue with the exception, in both the web and API projects | Sentry. The API log line `unhandled_error` names the real cause class, for example `cause=InvalidPasswordError` | Alert rule: "more than 5 events in 10 minutes", and "a new issue is created", email |
| Database connection failures | `/api/health` 503 and the log line `readiness_failed` (it says which dependency and the cause class); Sentry issues from the first failing query | The uptime monitor and Sentry, as above | Covered by the two rows above; nothing extra |
| An email failed for good | Sentry issue **"Outbox messages failed for good"** and the log line `outbox_messages_failed`, sent by the daily `/cron/drain-outbox` once a message has used up its five attempts | Sentry | Alert rule: "a new issue is created" for that title (it is a fixed text, so every failure groups into one issue) |
| The retention job or the drain did not run | The Vercel project's Cron Jobs page shows each run and its status; a crashed run is a Sentry issue | Vercel | Open the Cron Jobs page once a month, and after any deploy that touches `vercel.json`. A heartbeat monitor (Better Stack Heartbeats) calling after each run is an option if a silent miss ever matters |
| Certificate or domain expiring | Vercel issues and renews the certificate itself while the DNS points at it; the real risks are a DNS change that breaks renewal and the domain lapsing at Squarespace | The uptime monitor's SSL alert if it offers one (Better Stack does), "expires in 14 days"; the domain renewal date in Squarespace | Turn on the monitor's SSL alert, and put the domain renewal date in your calendar |
| A deployment failed | Vercel emails the team about failed production deployments | Vercel, Settings, Notifications | Check that deployment failures are switched on |
| Vercel usage limits (for example Function Storage at 75%) | Vercel emails the team at 75% | Vercel | Nothing to set up; see "Usage" in the Vercel dashboard |
| The nightly database backup failed | GitHub emails the repository owner when a workflow run fails (`backup.yml`) | GitHub | Check Settings, Notifications, Actions is on |

## Check each alert works

An alert nobody has seen fire is only a guess. Once, after setting them up:

1. **Uptime monitor:** pause the check's target or point a second test monitor at `/api/health-nope`; confirm the email arrives, then remove it.
2. **Sentry:** in each project's alert rule, use "Send test notification"; confirm the email.
3. **Sentry, failed email:** the path from a failed message to Sentry is covered by an automated test (`apps/api/tests/integration/test_cron_drain.py`). To see the real email once, trigger a failure on a Preview deployment only (never Production): point `EMAIL_PROVIDER` at an address that refuses mail, sign up, and run `/cron/drain-outbox` by hand six times.

## What never goes into an alert

No addresses, no names, no prayer text. The Sentry events are scrubbed (`apps/api/app/core/observability.py`), the failed-email message is fixed text with no count or address, and the retention job logs counts only.
