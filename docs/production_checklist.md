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
- [ ] DMARC at `_dmarc.wordonthewater.net`: found 2026-11-14 already published as `p=reject; adkim=s; aspf=s` with reports to Mailgun and a second address, not the `p=none` this list assumed. Until Kit and Postmark are signed with DKIM for `wordonthewater.net`, their mail from `hello@` is very likely rejected (a Kit confirmation never reached Gmail). Decide: keep `reject` and set DKIM first, or move to `p=none` with reports to `hello@wordonthewater.net` for the first weeks.
- [ ] Kit: the sending domain authenticated, sender `hello@wordonthewater.net`, the confirmation email branded. **Required before the first weekly broadcast and before any real sign-up** (see ADR 0008, broadcast spike); then re-test a sign-up confirmation and a tag-limited test broadcast from `hello@` and check the headers.
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
- [ ] Send a tag-limited test broadcast from `hello@` and read it (Part K).

---

## Part J. Exit gate and after launch

- [ ] A visitor on a mid-range phone can read the page, subscribe and confirm, and send a prayer request, and the prayer team receives it.
- [ ] All Part A budgets met and no high security findings.
- [ ] Part K is complete: the first weekly email reached a real inbox (not spam), from `hello@`, with the banner, the unsubscribe link and a working "Read it on the website" link.
- [ ] Two weeks after launch: review the DMARC reports, then move DMARC to `p=quarantine`.
- [ ] Revisit the accepted risks: delivery through Squarespace forwards and DMARC at `p=none` in the first weeks.
- [ ] Tell Claude Code, so it ticks the matching items in PLAN.md and the threat plan and closes Phase 1.

---

## Part K. Weekly email broadcasts (Kit)

How it works is in [devotional_format.md](devotional_format.md), "The weekly email (Kit)", and what was proven is in [ADR 0008](adr/0008-kit-subscriptions.md), "Broadcast spike". In short: `pnpm broadcast:devotional <folder> --tag <id>|--all` creates a **draft** in Kit; nothing is sent until you schedule it in Kit. The command runs on your own machine from the root `.env`, not on Vercel.

**One-time, before the first broadcast**
- [ ] Part E is done for Kit: sending domain authenticated (DKIM signed as `wordonthewater.net`), Kit in the merged SPF record, and the DMARC decision made. `_dmarc.wordonthewater.net` already publishes `p=reject` with strict alignment (found 2026-11-14), so without Kit's DKIM, mail from `hello@` is very likely rejected.
- [ ] Prove delivery from `hello@`: create a draft with `--tag <id>` for a tag that only you carry, send it, and check it lands in the inbox, not spam. In Gmail, "Show original" must say SPF, DKIM and DMARC pass. (The spike sent from a Gmail address as a workaround and landed in spam; that workaround is not needed once DKIM is set.)
- [ ] Read the test on a phone in the Mail app and the Gmail app, with dark mode on and off, and in Outlook if you can: the banner shows, the dark panels hold, quotes and "Paddle Out" are styled, and the dashes, quotes and © are correct.
- [ ] **Banner address.** The email loads the series banner (`art-night-swell-email.jpg`, 1200 x 677, 52 KB) from `SERIES_IMAGE_BASE` in `apps/web/src/lib/devotionals/kit-broadcast.ts`, which is the public repository on `main`. That works before launch but is not meant for heavy hotlinking: decide whether to keep it for a small list or point `EMAIL_IMAGE_BASE` at the live site's content address once Part G is done. Every new series needs its own email banner in its folder (crop the art wide, resize to 1200 px, JPEG under 100 KB).
- [ ] After Part G, the "Read it on the website" link (`SITE_URL`, default `https://wordonthewater.net`) opens the devotional. Click it in the test email.
- [ ] Kit account settings: timezone (set to Harare, UTC+2, 2026-11-14), the postal address Kit prints in the footer is the one you want public (it shows "PO Box 6055, Port Elizabeth, Eastern Cape 6001"), default sender `hello@wordonthewater.net`.
- [ ] Decide about the "Built with Kit" badge. The free plan adds it below every email and it cannot be restyled; a paid plan removes it.
- [ ] **Clean up the spike leftovers in Kit before real subscribers arrive**, so the first `--all` goes only to real people: the test subscriber(s), the `spike-test` tag, the empty "Imported November 14th, 2026…" tag, and the sent test broadcasts (ids 27039425, 27039513, 27039763, 27040594; the API cannot delete a sent broadcast, use the Kit dashboard).
- [ ] Keys: the command uses `KIT_API_KEY_PREVIEW` (add `--live` for `KIT_API_KEY`). Both belong to the same Kit account, so a draft appears in the live account either way. Keep the keys in the root `.env` only, never in the repo, chat or a Vercel variable for this command.

**The first real broadcast (`advent-01-more-than-watchmen`, publishAt Saturday 2026-12-05)**
- [ ] A few days before, run `pnpm broadcast:devotional advent-01-more-than-watchmen --all`, open the draft in Kit and check the subject (`emailSubject`), the preview text (`summary`) and the sender.
- [ ] Send yourself a test from Kit and read it on your phone.
- [ ] Schedule it in Kit for 2026-12-05 after 02:00 Harare time (the page goes live at 00:00 UTC), so the website link works when readers tap it.
- [ ] Check the unsubscribe link in the test: Kit shows `unsubscribed` and our mirror follows through the webhook (Part H).

**After the first send**
- [ ] In Kit's report, check recipients, opens, unsubscribes, bounces and complaints, and that bounces and complaints reached our mirror.
- [ ] Read the first DMARC reports and confirm Kit's mail passes, then continue with the `p=quarantine` step in Part J.
- [ ] From the second week on, follow the four steps in [devotional_format.md](devotional_format.md).
