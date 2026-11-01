# Sentry alert setup

Step 6 of `docs/sentry_checklist.md`. Two alerts per project, four in total. More would be noise. Tick each box as you finish the step. Menu names may differ slightly.

Alerts only cover production. Preview errors (including test errors) must not email you.

## Alert 1: new issue

Tells you the first time a particular error appears.

### Project `wotw-api`

- [ ] Open the project, then **Alerts, Create Alert**.
- [ ] Alert type: **Issues**.
- [ ] Environment: **production**.
- [ ] Condition: **A new issue is created**.
- [ ] Action: **Send a notification** to your email.
- [ ] Name it "New production issue" and save.

### Project `wotw-web`

- [ ] Open the project, then **Alerts, Create Alert**.
- [ ] Alert type: **Issues**.
- [ ] Environment: **production**.
- [ ] Condition: **A new issue is created**.
- [ ] Action: **Send a notification** to your email.
- [ ] Name it "New production issue" and save.

## Alert 2: error spike

Catches a flood of the same error, such as a database outage, which the new-issue alert reports only once.

### Project `wotw-api`

- [ ] **Alerts, Create Alert**, type **Issues**, environment **production**.
- [ ] Condition: **The issue is seen more than 10 times in 1 hour**.
- [ ] Action: email you, repeating at most once per hour.
- [ ] Name it "Error spike" and save.

### Project `wotw-web`

- [ ] **Alerts, Create Alert**, type **Issues**, environment **production**.
- [ ] Condition: **The issue is seen more than 10 times in 1 hour**.
- [ ] Action: email you, repeating at most once per hour.
- [ ] Name it "Error spike" and save.

The count of 10 is a starting point.
## Check

- [ ] The notification address is one you read daily.
- [ ] Four alerts are listed under **Alerts** (two per project), all on environment production.

## Not set up on purpose

- Preview alerts: test errors on preview branches would email you constantly.
- Performance and latency alerts: we send no performance data, so they would never fire.
- Regression alerts: Sentry already marks a resolved issue as regressed when it returns. Add later if wanted.

## Limits

Sentry only sees errors the apps report. A Vercel outage or a function that times out may report nothing, so the uptime monitor on `/api/health` (step 0.10 in `docs/PLAN.md`) is still needed.

## Afterwards

- [ ] Tick the step 6 boxes in `docs/sentry_checklist.md` and tell Claude, so it can update the plan.
