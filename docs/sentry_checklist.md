# Sentry setup

Checklist for step 0.10 (Sentry in web and API). The code is merged or ready and does nothing until a DSN is set. Tick each box as you finish the step. Dashboards change often, so menu names may differ slightly.

Never paste a DSN into chat, the repo or a ticket. It only goes into Vercel, as a Sensitive variable.

## Step 1: Account

- [ ] Sign up at sentry.io with your work email.
- [ ] Choose the **EU data region** if offered at signup. It cannot be changed later and matches `docs/privacy.md`.
- [ ] Pick the free Developer plan.
- [ ] Turn on two-factor login (also an E4 item in the threat plan).
- [ ] Store the recovery codes offline.

## Step 2: Projects

- [ ] Create an organisation (for example `thecodeblock`).
- [ ] Create a project named `wotw-api`, platform **FastAPI** (or Python).
- [ ] Create a project named `wotw-web`, platform **Next.js**.
- [ ] In each project turn off anything that stores personal data: under **Settings, Security & Privacy** enable **Data Scrubber** and **Prevent Storing of IP Addresses**.

## Step 3: Copy the DSNs

- [ ] `wotw-api`: **Settings, Client Keys (DSN)**, copy the DSN into the password manager as "Sentry wotw-api DSN".
- [ ] `wotw-web`: the same, saved as "Sentry wotw-web DSN".

## Step 4: Add the DSNs to Vercel

Mark every variable **Sensitive**.

- [ ] Project `wotw-api`, **Settings, Environment Variables**: add `SENTRY_DSN` with the `wotw-api` DSN, for **Production** and **Preview**.
- [ ] Project `wotw-web`, **Settings, Environment Variables**: add `SENTRY_DSN` with the `wotw-web` DSN, for **Production** and **Preview**.
- [ ] Leave **Development** empty. Local runs have no DSN and send nothing.

## Step 5: Deploy and prove an event arrives

Run this after the Sentry PR is merged to `main` and production has redeployed.

- [ ] Redeploy production for `wotw-api` and `wotw-web` so the new variable is picked up (a variable change only applies to new deployments).
- [ ] Send one test error from each app (ask Claude for the command or a temporary route; it is removed afterwards).
- [ ] In Sentry, the event appears in the matching project with the environment `production` or `preview`.
- [ ] Open the event and confirm it shows no request body, cookies, query string, email address or user. If anything personal is visible, stop and tell Claude.

## Step 6: Alerts

- [ ] In each project, create an alert for a new issue, sent to your email.
- [ ] Optionally add an alert for an error-rate spike.

## Afterwards

- [ ] Tell Claude the steps are done, so it can tick the Sentry items in `docs/PLAN.md` (0.10) and `docs/threat_plan.md` (section 2, I1).
