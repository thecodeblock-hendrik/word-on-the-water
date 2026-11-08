# Production checklist (just before launch)

Everything that is only needed when the site goes public lives here, not in [PLAN.md](PLAN.md). It was moved out of PLAN.md step 1.9, the launch parts of 1.3, 1.6 and 1.8, and the launch items of [threat_plan.md](threat_plan.md), so the rest of the plan can be finished first.

**`wordonthewater.net` stays inactive until Part G.** Parts A to F do not point the website at Vercel: the old Squarespace site keeps serving. Part E adds email DNS records only; the mailboxes (MX) are never touched.

Do not start this list until steps 1.3 to 1.8 in PLAN.md are ticked. Tick each box here and note the date. Never paste a secret into chat or the repo.

Related guides: [kit_webhook_checks.md](kit_webhook_checks.md) (domain, webhook and secret), [PWA_checklist.md](PWA_checklist.md) (the PWA, step by step), [runbooks/deploy.md](runbooks/deploy.md).

---

## Part A. Gate: is the rest done?

- [ ] PLAN.md steps 1.3 to 1.8 are all ticked (sign-up, prayer form, contact form, legal and SEO, retention, quality gates).
- [ ] Budgets met on a deployed preview: Lighthouse mobile (Performance 95, Accessibility 100, Best Practices 100, SEO 100), LCP under 2.0 s, CLS under 0.05, INP under 200 ms, landing JS under 100 KB gzipped.
- [ ] No unresolved high or critical finding in CodeQL, the dependency audits or gitleaks.

---

## Part B. Accounts and owner hardening (no domain needed)

- [ ] Vercel: upgrade to **Pro** (Hobby is non-commercial and has quota limits).
- [ ] Vercel: restrict who can promote to production; two-factor on every team member; turn on the **audit log** (Pro).
- [ ] Two-factor on Squarespace (domain and DNS) and the registrar lock on.
- [ ] Recovery codes for every account stored offline.
- [ ] With Pro: a log drain to a log store (Better Stack or Axiom) and a staging environment (a custom Vercel environment), deferred from step 0.10.
- [ ] Outbox cron changed to `*/5 * * * *` in `apps/api/vercel.json` and in the deploy runbook (Hobby fails the deploy with anything more frequent than daily).
- [ ] Vercel Firewall rate-limit rules on the form routes (sign-up, prayer, contact); Attack Challenge Mode noted in the incident runbook.

---

## Part C. Convert the site to a PWA

Do this on a branch and test it on a preview before launch. The detailed steps, with decisions to confirm first, are in [PWA_checklist.md](PWA_checklist.md). Scope: installable and full-screen with the right icon, name and colours. Not offline reading or push messages (later phases).

- [ ] `app/manifest.ts` (`MetadataRoute.Manifest`, read `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` first): `name`, `short_name` ("Word on the Water" and "WotW"), `description`, `id` and `start_url` `/`, `scope` `/`, `display: "standalone"`, `orientation: "portrait"`, `lang: "en"`, `categories`, and `background_color` and `theme_color` from the design tokens
- [ ] Icons: 192 and 512 px PNG (`purpose: "any"`), a 512 px maskable icon with the logo inside the safe zone, `app/icon.svg` as favicon, and `app/apple-icon.png` (180 px) for iOS home screens, generated from the inline SVG logo
- [ ] Manifest `shortcuts` to the sections people return to ("Start here", "Prayer request") and `screenshots` (narrow, 375 px) for the richer Android install sheet
- [ ] iOS: `metadata.appleWebApp` (`capable`, `title`, `statusBarStyle`) and `viewport` `themeColor` per colour scheme with `viewport-fit=cover`
- [ ] Tests first: a unit test of the manifest object (required fields, icon sizes and purposes, colours match the tokens); an e2e test that `/manifest.webmanifest` and every icon return 200 with the right content type under the CSP
- [ ] Installability check: Chrome DevTools, Application panel, no manifest errors; "Install app" on Android Chrome and "Add to Home Screen" on iOS Safari show the right icon, name and splash colours, open standalone and respect safe areas

---

## Part D. Security and operations checks (staging or preview)

- [ ] Run the CSP in report-only on staging (`CSP_REPORT_ONLY=1`), review the reports, then enforce it in production (`CSP_REPORT_ONLY` off).
- [ ] The production response has the CSP header and it is enforced (threat plan T3).
- [ ] `/docs` and `/openapi.json` return 404 in production (threat plan I5).
- [ ] `migrate.yml` with a manual approval; production auto-promotion off; promote after the migrations and the smoke tests pass.
- [ ] Rollback rehearsed with Vercel Instant Rollback.
- [ ] Backup restore tested from the nightly dump and from Neon point-in-time recovery (`docs/runbooks/restore-db.md`).
- [ ] ZAP baseline scan against staging: no high findings.
- [ ] The retention job (PLAN.md 1.7) runs on the production cron.

---

## Part E. Email authentication (adds DNS records only; the website is not switched)

These are TXT and CNAME records in **Squarespace DNS** for `wordonthewater.net`. The MX records (the `hello@` and `prayer@` forwards) are never changed. There must be only **one** SPF record: edit the existing one, never add a second.

- [ ] One merged SPF record that includes Postmark and Kit and keeps what Squarespace's email forwarding already put there.
- [ ] DKIM for Postmark and for Kit.
- [ ] A custom return-path for each sender.
- [ ] DMARC at `_dmarc.wordonthewater.net` with `p=none` and reports to `hello@wordonthewater.net`.
- [ ] Kit: the sending domain authenticated, sender `hello@wordonthewater.net`, the confirmation email branded.
- [ ] Postmark: the sender signature or domain verified for `hello@wordonthewater.net`.
- [ ] Send a test from Postmark to `hello@` and to `prayer@` and confirm each arrives after forwarding (inbox, not spam); check the SPF, DKIM and DMARC results in the message headers. If forwarding proves unreliable, point `PRAYER_INBOX` and `CONTACT_INBOX` straight at the destination mailbox and keep `hello@` and `prayer@` as the public addresses.

---

## Part F. Production configuration (still no domain switch)

- [ ] `wotw-api` Production variables set: `EMAIL_FROM=Word on the Water <hello@wordonthewater.net>`, `PRAYER_INBOX=prayer@wordonthewater.net`, `CONTACT_INBOX=hello@wordonthewater.net`, `POSTMARK_SERVER_TOKEN` (Sensitive), `EMAIL_PROVIDER=postmark`, and the prayer encryption key variables when step 1.4 adds them. Preview keeps its test inboxes.
- [ ] Public site URL `https://wordonthewater.net` set for metadata, the sitemap and links in email.
- [ ] Production Kit: the real form with double opt-in on, and the production `KIT_API_KEY` and `KIT_FORM_ID` in Production only.
- [ ] The Cloudflare Turnstile production widget lists only `wordonthewater.net` and `www.wordonthewater.net`. It will refuse any `*.vercel.app` address (error 110200), so the production smoke test must run on the real domain.
- [ ] Tokens match in `wotw-web` and `wotw-api` Production (`SERVICE_TOKEN`), and `API_BYPASS_SECRET` is set in `wotw-web` Production.
- [ ] Production database is on the current migration with no test data, and the production and preview roles have different passwords.

---

## Part G. Go live: attach the domain (this switches the website)

Follow [kit_webhook_checks.md](kit_webhook_checks.md), Part 0 to Part 2, step by step. In short:

- [ ] Screenshot every Squarespace DNS record first, so you can undo.
- [ ] Add `wordonthewater.net` to the `wotw-web` Vercel project (apex primary, `www` redirecting to it); copy the exact A and CNAME values Vercel shows into Squarespace DNS; leave the MX records alone.
- [ ] `wotw-api` stays on its protected `vercel.app` address.
- [ ] HTTPS and the HSTS header check out on the apex and on `www`.
- [ ] `hello@` and `prayer@` still forward after the change.

---

## Part H. Kit form redirect and webhook

- [ ] Kit production form: set the redirect after sign-up and after confirmation to `https://wordonthewater.net/thank-you`.
- [ ] Redeploy `wotw-web` and `wotw-api` in Production (the new routes and `/thank-you` exist on production only after this).
- [ ] Register the webhook: `make kit-webhook URL=https://wordonthewater.net/api/webhooks/kit`, put the secret into `wotw-api` Production as Sensitive, redeploy the API ([kit_webhook_checks.md](kit_webhook_checks.md), Parts 3 and 4).
- [ ] Confirm with the first real delivery that Kit's signature is accepted (Kit shows 200; the HMAC key format is inferred from Kit's docs and has never seen a real delivery).

---

## Part I. Production smoke test (on the real domain)

- [ ] Subscribe with a real address, confirm through the Kit email, land on `/thank-you`; Kit shows `active` and our mirror shows the same.
- [ ] Unsubscribe through the Kit link; our mirror shows `unsubscribed`.
- [ ] Send a prayer request: the prayer inbox receives it (and the text is in the email only if the consent box was ticked).
- [ ] Send a contact message: it arrives in `hello@`.
- [ ] The rate limit answers 429 on repeated sign-ups, and a form without the spam check is refused.
- [ ] No personal data or prayer text appears in the logs or Sentry.

---

## Part J. Exit gate and after launch

- [ ] A visitor on a mid-range phone can read the page, subscribe and confirm, and send a prayer request, and the prayer team receives it.
- [ ] All Part A budgets met and no high security findings.
- [ ] Two weeks after launch: review the DMARC reports, then move DMARC to `p=quarantine`.
- [ ] Revisit the accepted risks: delivery through Squarespace forwards and DMARC at `p=none` in the first weeks.
- [ ] Tell Claude Code, so it ticks the matching items in PLAN.md and the threat plan and closes Phase 1.
