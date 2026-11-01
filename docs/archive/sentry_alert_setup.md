# Sentry alert setup

Step 6 of `docs/archive/sentry_checklist.md`. Two alerts per project, four in total. More would be noise. Tick each box as you finish the step. Menu names may differ slightly.

Alerts only cover production. Preview errors (including test errors) must not email you.

## Alert 1: new issue

Tells you the first time a particular error appears.

### Project `wotw-api`

- [x] Open the project, then **Alerts, Create Alert**.
- [x] Alert type: **Issues**.
- [x] Environment: **production**.
- [x] Condition: **A new issue is created**.
- [x] Action: **Send a notification** to your email.
- [x] Name it "New production issue" and save.

### Project `wotw-web`

- [x] Open the project, then **Alerts, Create Alert**.
- [x] Alert type: **Issues**.
- [x] Environment: **production**.
- [x] Condition: **A new issue is created**.
- [x] Action: **Send a notification** to your email.
- [x] Name it "New production issue" and save.

## Alert 2: error spike

Catches a flood of the same error, such as a database outage, which the new-issue alert reports only once.

### Project `wotw-api`

- [x] **Alerts, Create Alert**, type **Issues**, environment **production**.
- [x] Condition: **The issue is seen more than 10 times in 1 hour**.
- [x] Action: email you, repeating at most once per hour.
- [x] Name it "Error spike" and save.

### Project `wotw-web`

- [x] **Alerts, Create Alert**, type **Issues**, environment **production**.
- [x] Condition: **The issue is seen more than 10 times in 1 hour**.
- [x] Action: email you, repeating at most once per hour.
- [x] Name it "Error spike" and save.

The count of 10 is a starting point.
## Check

- [x] The notification address is one you read daily.
- [x] Four alerts are listed under **Alerts** (two per project), all on environment production.

## Not set up on purpose

- Preview alerts: test errors on preview branches would email you constantly.
- Performance and latency alerts: we send no performance data, so they would never fire.
- Regression alerts: Sentry already marks a resolved issue as regressed when it returns. Add later if wanted.

## Limits

Sentry only sees errors the apps report. A Vercel outage or a function that times out may report nothing, so the uptime monitor on `/api/health` (step 0.10 in `docs/PLAN.md`) is still needed.

## Afterwards

- [x] Tick the step 6 boxes in `docs/archive/sentry_checklist.md` and tell Claude, so it can update the plan.
