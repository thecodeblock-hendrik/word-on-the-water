# Production checklist (just before launch)

**Launch date: Saturday 28 November 2026.** Everything that is only needed when the site goes public lives here, not in [PLAN.md](PLAN.md). It was moved out of PLAN.md step 1.9, the launch parts of 1.3, 1.6 and 1.8, and the launch items of the old threat plan and webhook guide (both now in [archive/](archive/)), so the rest of the plan can be finished first. Everything outstanding that is **not** about launch lives in [PLAN.md](PLAN.md).

**`wordonthewater.net` stays inactive until Part G.** Parts A to F do not point the website at Vercel: the old Squarespace site keeps serving. Part E adds email DNS records only; the mailboxes (MX) are never touched.

Do not start this list until steps 1.3 to 1.8 in PLAN.md are ticked. Tick each box here and note the date. Never paste a secret into chat or the repo.

Related guides: [PWA_checklist.md](PWA_checklist.md) (the PWA, step by step), [runbooks/deploy.md](runbooks/deploy.md), [runbooks/alerts.md](runbooks/alerts.md). The domain and webhook steps that used to be a separate guide are now Parts G and H below.

---

## Where we stand (2026-11-21, one week before launch)

The domain `wordonthewater.net` is live on Vercel Pro (Part G), the Kit webhook is skipped and replaced by a daily sync (Part H), and the Part D checks that need no staging are done. Counts are of ticked and unticked boxes in each part:

| Part | Subject | Done | Open | Who and what |
|---|---|---|---|---|
| A | Gate: is the rest done? | 8 | 0 | Done |
| B | Accounts and owner hardening | 9 | 0 | Done (the log drain and staging are deferred to after launch) |
| C | Convert the site to a PWA | 7 | 0 | Done |
| D | Security and operations checks | 4 | 2 | Left: the rollback rehearsal and the backup restore test (Hendrik); `migrate.yml`, staging, ZAP and CSP report-only are deferred to [post_launch.md](post_launch.md) |
| E | Email authentication | 5 | 0 | Done |
| F | Production configuration | 6 | 2 | Hendrik: database check, preview widget |
| G | Go live: attach the domain | 11 | 1 | Done: the domain is live (only the "to go back" note stays unticked) |
| H | Kit form redirect | 7 | 0 | Done except the optional webhook (skipped, needs a paid Kit plan) |
| I | Production smoke test | 12 | 9 | Everything Claude can check is ticked (2026-11-21); left for Hendrik: Sentry, the database consent version, the WhatsApp and Rich Results checks, the phone and desktop colour schemes, the day-after cron check; and the Part K broadcast |
| J | Exit gate and after launch | 0 | 12 | Launch gate and after launch |
| K | Weekly email broadcasts | 1 | 16 | Hendrik: first broadcast steps in Kit |
| L | Got Questions chat | 4 | 3 | Hendrik: preview walk-through, firewall rule |

**Done on 2026-11-21:** the first live sign-up end to end (Turnstile, Kit confirmation in the inbox, `/cron/sync-kit` moved the mirror to active), after fixing the production Kit API key (see the Part F incident note). **Next, in order:** the Part F leftovers (database check, preview widget) and the Part D rehearsals (rollback, backup restore); then the rest of the Part I smoke test on the live domain and the first broadcast (Part K). After every merge, promote the new production builds by hand (Part D). Tell Claude Code what was done so it ticks the matching items here and in [PLAN.md](PLAN.md).

---

## Part A. Gate: is the rest done?

- [x] PLAN.md steps 1.3, 1.6, 1.7, 1.8 and 1.11 are done (sign-up, legal and SEO, retention, quality gates, final landing page review), checked 2026-11-18. Three optional items are deliberately moved after launch and stay unticked there: the footer link to a full statement of faith (1.6), moving the crons to Vercel Schedules (1.7) and a Holy Spirit or Jesus' return point in the statement of faith (1.11); the devotional archive page is Phase 2.3. Article JSON-LD was built for launch. The prayer form (1.4) and contact form (1.5) are deferred past launch (decided 2026-11-14).
- [x] Budgets met (checked 2026-11-18 from the CI and preview measurements in PLAN.md 1.8): Lighthouse mobile Performance 95, Accessibility 100 and Best Practices 100, LCP under 2.0 s, CLS under 0.05, INP under 200 ms (lab figure; real INP comes from Speed Insights after launch), landing JS under 165 KB gzipped ([ADR 0010](adr/0010-landing-js-budget.md)). **SEO 100 is checked on the real domain** in Part I, because Vercel adds `x-robots-tag: noindex` to previews and a preview scores 69.
- [x] No unresolved high or critical finding in CodeQL, the dependency audits or gitleaks (checked 2026-11-18: 0 open CodeQL alerts, `pnpm audit` and `pip-audit` have no high or critical findings, gitleaks found nothing in all 147 commits, the Security and CodeQL workflows are green on `main`). Three advisories are accepted with an expiry (see Part J); GitHub's own Dependabot and secret-scanning alerts are disabled for the repository, so these tools are the check.
- [x] **Privacy policy:** the responsible name (the registered name, Word On The Water) and the postal address (PO Box 6055, Port Elizabeth, Eastern Cape 6001, the same one Kit prints) are filled in (2026-11-14). The whole page was read by Hendrik on 2026-11-18 and found in order (it carries the 2026-11-18 date in `PRIVACY_UPDATED`; update it if the text changes again). `pnpm check:placeholders` passes (the two social handles were removed, see the next item).
- [x] **Content decisions (Hendrik), done 2026-11-18:** the two social handles are removed for now (the footer shows only Email; add an entry to `footer.social` in `landing.ts` when an Instagram or YouTube account exists), "Start here" (the gospel in 4 steps) was read and found in order, and `pnpm check:placeholders` in `apps/web` reports nothing.
- [x] **Privacy decisions (Hendrik, from [privacy.md](privacy.md)), done 2026-11-18:** regulator kept as the policy names it (South Africa's Information Regulator, and the visitor's own EU authority); Upstash in Frankfurt; forwards received by Gmail (named in the policy); data processing agreements checked with every provider (table in privacy.md). Leftovers, not blocking: print the Kit and Vercel DPAs to PDF, re-check Vercel's DPA and plan on the move to Pro (Part B), decide on Neon's optional e-signature before prayer requests are stored.
- [x] Kit: link to `https://wordonthewater.net/privacy` (done 2026-11-18 by Hendrik): added as "Privacy Policy" at the end of the small-print line of the confirmation email of the production form "Word On The Water sign-up" (checked that it points at the right address). Kit hosts no thank-you or confirmation page for this form: it redirects to `/thank-you` on our site, which has no place for text in Kit and already links the policy through the site footer (covered by an e2e test, `signup.spec.ts`). The site's own sign-up line links it too.
- [x] Got Questions chat (PLAN.md 1.10): decided 2026-11-18 that the chat launches on. `CHAT_ENABLED` is already set in Production (checked 2026-11-16), so the work left is Part L (the preview walk-through, the rate-limit and firewall check, and checking the button opens the chat in Production). The mail-link fallback to `hello@wordonthewater.net` remains the rollback: unset `CHAT_ENABLED`.

---

## Part B. Accounts and owner hardening (no domain needed)

- [x] Vercel: upgrade to **Pro** (Hobby is non-commercial and has quota limits). (checked 2026-11-21: team `thecodeblock` is on the `pro` plan)
- [x] After the move to Pro, look at **Cold Start Prevention** in each project's Functions settings (it shows "Disabled" on Hobby, 2026-11-17; Vercel's docs say Pro keeps one production instance warm but its pricing page lists the feature under Enterprise, so confirm in the dashboard). Fluid compute is already on for both projects. Then leave both idle for 10 minutes, open the chat and click a topic: it took about 2 s on Hobby (API 2.1 s cold against 0.7 s warm). If it is still slow, ping both functions every 5 minutes. (done 2026-11-21: there is no separate toggle on Pro, Hendrik confirmed in the dashboard that cold-start prevention is built into Fluid Compute and enabled on both projects, and the API shows `fluid: true` for both. Measured after 15 minutes idle, time to first byte of the first request against a warm one: web page 0.95 s against 0.28 s, API health check 0.62 s against 0.23 s through `vercel curl`. The API stays warm because the 5-minute outbox cron calls it; the web page has a cold first request about 0.65 s slower, with no multi-second cold start (Hobby measured about 2.1 s cold against 0.7 s warm for the API on 2026-11-17). The full chat journey, opening the chat and clicking a topic, was not measured: try it on a phone after 10 minutes idle)
- [x] Vercel: restrict who can promote to production; two-factor on every team member; turn on the **audit log** (Enterprise only; on Pro the free Activity Log is always on). (checked 2026-11-21: the team has one member, the owner, so only Hendrik can promote; two-factor on that account done by Hendrik, see the next items. The Vercel **audit log is Enterprise-only**: Pro has the free Activity Log, which needs no switch, so this item cannot be done as first written and the Activity Log stands in for it ([Vercel audit log docs](https://vercel.com/docs/audit-log)). Add a second member only with a role that cannot promote)
- [x] Two-factor on Squarespace (domain and DNS) and the registrar lock on. (done by Hendrik 2026-11-21)
- [x] Two-factor on GitHub, Vercel, Neon, Upstash, Kit and Squarespace (Postmark when it is set up), threat E4. (done by Hendrik 2026-11-21, not verifiable from here: GitHub's API returned null for the two-factor status because the token lacks the scope. GitHub two-factor belongs to the `thecodeblock-hendrik` user account, which owns the repository as a User, not an organisation)
- [x] Recovery codes for every account stored offline. (done by Hendrik 2026-11-21)
- [x] Rotate any secret that was ever shown in a chat, a screenshot or a log ([runbooks/rotate-secrets.md](runbooks/rotate-secrets.md)). (done by Hendrik 2026-11-21; which secrets were rotated was not reported, so the rotation log in the runbook is the record. If the Kit API key was one of them, the next sign-up or a hand run of `/cron/sync-kit` is the proof it works: remember a changed variable needs a redeploy and a promote, Part D)
- Deferred after launch (decided 2026-11-21, now in PLAN.md 1.7): a log drain to a log store (Better Stack or Axiom) and a staging environment. Per-PR previews are the pre-production check for launch, and Vercel's own runtime logs have been enough to find every problem so far. A drain would send visitor IP addresses to a new processor, so it needs the privacy documents updated first.
- [x] Outbox cron changed to `*/5 * * * *` in `apps/api/vercel.json` and in the deploy runbook (Hobby fails the deploy with anything more frequent than daily).
- [x] Vercel Firewall rate-limit rules on the sign-up route and on `/v1/chat/messages` (the prayer and contact routes when those forms are built); Attack Challenge Mode noted in the incident runbook. (done by Hendrik 2026-11-21: two rate-limit rules on `wotw-web`, matched on Server Action Name because sign-up and chat are Server Actions and not paths, so `/v1/chat/messages` is not reachable from the public site; the values are in [runbooks/deploy.md](runbooks/deploy.md), "Firewall rules"; both start on Log; Hendrik did not report which action names the dashboard listed, so confirm they read `subscribe`, `sendChat` and `warmChat`; Attack Challenge Mode is in [runbooks/incident.md](runbooks/incident.md))

---

## Part C. Convert the site to a PWA

Do this on a branch and test it on a preview before launch. The detailed steps, with decisions to confirm first, are in [PWA_checklist.md](PWA_checklist.md). Scope: installable and full-screen with the right icon, name and colours. Not offline reading or push messages (later phases).

- [x] `app/manifest.ts` (`MetadataRoute.Manifest`, read `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` first): `name`, `short_name` ("Word on the Water" and "WotW"), `description`, `id` and `start_url` `/`, `scope` `/`, `display: "standalone"` (no `orientation` lock: it fails WCAG 1.3.4), `lang: "en"`, `categories`, and `background_color` and `theme_color` from the design tokens (done 2026-11-17, PR #136)
- [x] Icons: 192 and 512 px PNG (`purpose: "any"`), a 96 px icon for the Start here shortcut, a 512 px maskable icon with the logo inside the safe zone, `app/icon.svg` as favicon, and `app/apple-icon.png` (180 px) for iOS home screens, generated from the inline SVG logo (done 2026-11-17, PR #136)
- [x] Manifest `shortcuts` to the sections people return to ("Start here"; "Prayer request" is added when that feature is built) and `screenshots` (narrow, 375 px, of the landing page, a devotional and the Bible reader, which is on in Production since 2026-11-16) for the richer Android install sheet (done 2026-11-17, PR #136)
- [x] Open decisions before building ([PWA_checklist.md](PWA_checklist.md) step 1): a minimal offline fallback page now or in Phase 3 (the service worker is shared with Web Push, [web_push.md](web_push.md)), iOS `apple-touch-startup-image` launch screens, and a wide screenshot for the desktop install sheet (done 2026-11-17, PR #136)
- [x] iOS: `metadata.appleWebApp` (`capable`, `title`, `statusBarStyle`) and `viewport` `themeColor` per colour scheme with `viewport-fit=cover` (done 2026-11-17, PR #136)
- [x] Tests first: a unit test of the manifest object (required fields, icon sizes and purposes, colours match the tokens); an e2e test that `/manifest.webmanifest` and every icon return 200 with the right content type under the CSP. Decide whether the proxy matcher should also skip the manifest and icons (today only `api/`, `_next/static/`, `_next/image` and `favicon.ico` are skipped; harmless either way, see PWA_checklist step 6) (done 2026-11-17, PR #136)
- [x] Installability check (2026-11-18: confirmed by Hendrik on a preview: the desktop Manifest panel and install, the Android emulator install and the iPhone checks all passed; the rotation check found the landscape menu bug, fixed in PR #142; repeat the install on the real domain after Part G): Chrome DevTools, Application panel, no manifest errors; "Install app" on Android Chrome and "Add to Home Screen" on iOS Safari show the right icon, name and splash colours, open standalone and respect safe areas; sign-up and `/thank-you` work in the installed window, and Got Questions too when `CHAT_ENABLED` is on in the preview. Previews are behind Deployment Protection, so icons may look missing there: if they do, check again on the real domain after Part G before blaming the icons (PWA_checklist step 8)

---

## Part D. Security and operations checks (staging or preview)

- Skipped (decided 2026-11-21): the CSP report-only run on staging. The enforced CSP is already confirmed on production (next item) and `CSP_REPORT_ONLY` is unset there; a report-only run can be done later on a `staging` branch preview (PLAN.md 1.7).
- [x] The production response has the CSP header and it is enforced (threat plan T3) (checked 2026-11-21 on `wotw-web.vercel.app`: `content-security-policy` header with a nonce, `CSP_REPORT_ONLY` not set in Production).
- [x] `/docs` and `/openapi.json` return 404 in production (threat plan I5) (checked 2026-11-21 with `vercel curl` against `wotw-api.vercel.app`: both give the app's own 404, `/health/live` gives 200; `ENVIRONMENT=production` is set).
- Deferred after launch (decided 2026-11-21, now in [post_launch.md](post_launch.md), before Phase 2): `migrate.yml`, a GitHub Action that runs the production migrations after a manual approval. Until then migrations run by hand ([runbooks/deploy.md](runbooks/deploy.md)): apply a migration first, promote second. Auto-promotion is already off in both Vercel projects (checked 2026-11-21: `autoAssignCustomDomains` is false), so **after every merge to `main`, the new production deployment of `wotw-api` and `wotw-web` must be promoted by hand** (Vercel, Deployments, the newest Ready one, three dots, Promote to Production, or `vercel promote <url>`). Until then the live site and the crons run the last promoted build (on 2026-11-21 that was the API from 17 November and the web site from 18 November, so the 5-minute drain, the Kit sync, the landscape menu fix and the Article JSON-LD were not live). Promote the API first when a merge changes both, and after any migration has been applied.
- [ ] Rollback rehearsed with Vercel Instant Rollback.
- [ ] Backup restore tested from the nightly dump and from Neon point-in-time recovery (`docs/runbooks/restore-db.md`).
- Deferred (decided 2026-11-21): a ZAP scan against staging. The weekly `zap.yml` job already scans a production build in CI (PR #117); a one-off scan of a preview with the protection bypass header is optional (PLAN.md 1.7).
- [x] Re-check the Done threat items on the deployed site (threat model S1, S2, S4, T4, E1): calls without the service token or `CRON_SECRET` give 401, a forged `X-Client-IP` is ignored, CI security workflows are green, `app_runtime` cannot run DDL. (checked 2026-11-21 on `wotw-api.vercel.app` with `vercel curl`: `/v1/ping`, `POST /v1/subscribers`, `/cron/drain-outbox` and `/cron/retention` give 401 with no or a wrong token, and a forged `X-Client-IP` without a token gives 401; Security, CodeQL and CI are green on `main` at f16cc4f; as `app_runtime` on the production database, create table gives "permission denied for schema public", alter and drop table "must be owner", truncate "permission denied", and select works)
- [x] The retention job (PLAN.md 1.7) runs on the production cron (checked 2026-11-21: `/cron/retention` is scheduled `30 3 * * *` in `apps/api/vercel.json`, and Hendrik saw a successful run in the Vercel dashboard, Settings, Cron Jobs; Hobby keeps runtime logs for about an hour, so earlier runs cannot be read back).

---

## Part E. Email authentication (adds DNS records only; the website is not switched)

These are TXT and CNAME records in **Squarespace DNS** for `wordonthewater.net`. The MX records (the `hello@` and `prayer@` forwards) are never changed. There must be only **one** SPF record: edit the existing one, never add a second.

- [x] SPF: no change needed for Kit (done 2026-11-15, [kit_setup.md](archive/kit_setup.md)): Kit's return-path CNAME `ckespa` covers its SPF, so the existing `v=spf1 include:mailgun.org ~all` stays as it is. Never add a second SPF record.
- [x] DKIM for Kit: done 2026-11-15, two CNAMEs (`cka._domainkey`, `cka2._domainkey`) in Squarespace DNS, signed as `d=wordonthewater.net`. DKIM for Postmark waits for the prayer and contact forms (steps in [kit_setup.md](archive/kit_setup.md)).
- [x] Return-path for Kit: done 2026-11-15 (`ckespa` CNAME). Postmark's return-path comes with Postmark, after launch.
- [x] DMARC at `_dmarc.wordonthewater.net`: found 2026-11-14 already published as `p=reject; adkim=s; aspf=s` with reports to Mailgun and a second address, not the `p=none` this list assumed. Until Kit and Postmark are signed with DKIM for `wordonthewater.net`, their mail from `hello@` is very likely rejected (a Kit confirmation never reached Gmail). Decided 2026-11-15: keep `p=reject` and leave the record untouched (it belongs to the Squarespace email forwarding preset); Kit's DKIM aligns with `adkim=s`, and a test passed SPF, DKIM and DMARC. The report addresses are Squarespace's and Mailgun's, not a person's, so reports are not read by us.
- [x] Kit: sending domain `wordonthewater.net` verified, default sender `hello@wordonthewater.net`; a test broadcast reached the Gmail inbox with SPF, DKIM and DMARC all PASS (2026-11-15, [kit_setup.md](archive/kit_setup.md)). **Still to do:** a real sign-up through the live form with a fresh address (confirmation arrives, link works), the confirmation email branded, and delete the test and SPIKE draft broadcasts in Kit.
- Postmark (sender signature, DNS records, the test to `hello@` and `prayer@`) is not part of the launch: the prayer and contact forms are deferred, and Kit sends every launch email. The steps moved to PLAN.md 1.4.

---

## Part F. Production configuration (still no domain switch)

- [x] `wotw-api` Production variables set (**incident 2026-11-21:** the first live sign-up failed because Kit answered 401 to the `KIT_API_KEY` stored in Production, while the same account accepted the key in the local `.env`; the form id `10158126` was right. Vercel hides Sensitive values, so the stored value could not be inspected. Replacing it with the working key, redeploying and promoting fixed it, and the queued sign-up was delivered by the outbox retry. Lesson: after changing a variable, redeploy and promote, and expect the old deployment to serve a few cron runs first.): `KIT_API_KEY`, `KIT_FORM_ID` and `TURNSTILE_SECRET_KEY` (Sensitive where Vercel allows). `EMAIL_FROM` (`Word on the Water <hello@wordonthewater.net>`; nothing reads it yet, checked 2026-11-21), `PRAYER_INBOX`, `CONTACT_INBOX`, `POSTMARK_SERVER_TOKEN`, `EMAIL_PROVIDER=postmark` and the prayer encryption key come with steps 1.4 and 1.5 (PLAN.md). Preview keeps its test values. (checked 2026-11-21: `KIT_API_KEY` and `TURNSTILE_SECRET_KEY` are Secret and `KIT_FORM_ID` is set in `wotw-api` Production; `EMAIL_FROM` is not read by anything yet)
- [x] Public site URL `https://wordonthewater.net` for metadata, the sitemap and links in email (checked 2026-11-21: `SITE_URL` is not set in Production on purpose, the code defaults to `https://wordonthewater.net` (`apps/web/src/lib/site.ts`), and `wotw-web.vercel.app` already serves that address in its canonical link and every sitemap `<loc>`).
- [x] Production Kit: the real form with double opt-in on, and the production `KIT_API_KEY` and `KIT_FORM_ID` in Production only. Preview and Development use the Kit test form and key (or a separate Kit account), never the production key now that real subscribers exist. (confirmed by Hendrik 2026-11-21)
- [x] Production uses only the production Turnstile widget keys (the API refuses Cloudflare's test secrets in production by design). `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set for Production, and `wotw-web` is redeployed after it was added (the value is built into the site). (confirmed by Hendrik 2026-11-21)
- [ ] The Cloudflare Turnstile **preview** widget (key ending `…33Cdq…`) should list the preview hosts: on 2026-11-17 Chrome showed error 110200 ("domain not allowed") on a per-deployment preview address (`wotw-<hash>-thecodeblock.vercel.app`), so check which hostnames it lists and whether `vercel.app` matches subdomains. Not needed for launch.
- [x] The Cloudflare Turnstile production widget lists only `wordonthewater.net` and `www.wordonthewater.net`. It will refuse any `*.vercel.app` address (error 110200), so the production smoke test must run on the real domain. (confirmed by Hendrik 2026-11-21)
- [x] Tokens match in `wotw-web` and `wotw-api` Production (`SERVICE_TOKEN`), and `API_BYPASS_SECRET` is set in `wotw-web` Production. (proven 2026-11-21 by the first live sign-up: the browser request went through the web app to `POST /v1/subscribers` on the API, which only answers with a matching `SERVICE_TOKEN` and, behind the login wall, `API_BYPASS_SECRET`; the values themselves were not compared)
- [ ] Production database is on the current migration with no test data, and the production and preview roles have different passwords.

---

## Part G. Go live: attach the domain (this switches the website)

**Attaching `wordonthewater.net` to Vercel replaces the Squarespace site with the new site.** Do this only when you are happy for the new site to be public. Email is not affected as long as the MX records are left alone (`hello@` and `prayer@` keep forwarding). Never paste a secret into chat or the repo.

- [x] A production deployment of `wotw-web` built from the latest `main` is **Ready** (Vercel, `wotw-web`, Deployments, filter Production; if the newest is Cancelled or old, three dots on the latest Ready one, then **Redeploy**). Have Squarespace and Vercel open in two tabs.

**G1. Save the old DNS so you can undo**
- [x] Squarespace, Domains, `wordonthewater.net`, DNS Settings: screenshot **every** record (A, CNAME, MX, TXT) and keep it safe.
- [x] Note the MX records and every TXT record starting `v=spf1`: you will not touch them.

**G2. Add the domain in Vercel**
- [x] `wotw-web`, Settings, Domains, Add: `wordonthewater.net` attached to **Production**, and `www.wordonthewater.net` set to **redirect to** `wordonthewater.net` (apex is primary).
- [x] Vercel shows "Invalid configuration" and lists the records it needs (an **A record** for the apex and a **CNAME** for `www`). Copy the exact values from that page; do not type them from memory.
- [x] `wotw-api` stays on its protected `vercel.app` address.

**G3. Change the records in Squarespace**
- [x] Replace the existing apex (`@`) A records and the `www` record that point at Squarespace with the values Vercel showed. If Squarespace marks some as "Squarespace defaults" for the website, remove those for the apex and `www` only.
- [x] Do **not** change the MX records, the SPF TXT record or any DKIM or DMARC record (the Kit `ckespa`, `cka._domainkey` and `cka2._domainkey` CNAMEs stay too). Save.

**G4. Check it**
- [x] After a few minutes (up to a few hours for DNS) both Vercel domain rows show **Valid Configuration** and a certificate. (done 2026-11-21: Hendrik saw Valid Configuration on the apex; the `www` certificate was still being issued at that point and `www` answered over HTTPS when checked afterwards; authoritative DNS answers `216.150.1.1` and the Vercel CNAME)
- [x] `https://wordonthewater.net` shows the new site; `https://www.wordonthewater.net` redirects to it; HTTPS and the HSTS header check out on both. (checked 2026-11-21 via `curl --resolve`: apex 200 from Vercel with HSTS `max-age=63072000; includeSubDomains; preload`, `www` 308 to the apex, http redirects to https, Let's Encrypt certificate valid to 2027-02-19)
- [x] A test email to `hello@wordonthewater.net` and one to `prayer@wordonthewater.net` still arrive in your mailbox. (done 2026-11-21: both arrived within 13 seconds, but in Gmail's spam folder; SPF, DKIM and DMARC all passed and Gmail's reason was "similar to messages identified as spam", from a one-word test sent from the same Gmail account; fix is Report not spam and a Gmail filter)
- [ ] To go back: restore the A and CNAME records from the G1 screenshot.

---

## Part H. Kit form redirect (the webhook is not used at launch)

**Decision 2026-11-21: no Kit webhook at launch.** Kit's webhook endpoints (`/v4/webhook_endpoints`) refuse this account's API key with 401 "Authentication Failed" while every other call works (`/account`, `/forms`, `/tags` and the legacy `/webhooks` give 200), and Hendrik confirmed in Kit that webhooks need a paid plan, which we are not buying. The legacy `/webhooks` resource is not a way round it: it carries no signing secret and our receiver refuses unsigned calls. Kit still sends mail, runs double opt-in and honours unsubscribes by itself. What would have kept our database mirror in step is now a **daily sync**: `GET /cron/sync-kit` at 03:00 UTC reads every subscriber from Kit's API, before the retention job (03:30) deletes pending rows, so people who confirmed are `active` and survive it (ADR 0008, PLAN.md 1.3). The receiver route and `make kit-webhook` stay in the code for a paid plan.

**H1. Redirect and redeploy**
- [x] Kit production form: set the redirect after sign-up and after confirmation to `https://wordonthewater.net/thank-you`. (done by Hendrik 2026-11-21; the form also has auto-confirm off, which double opt-in needs, and reCAPTCHA off, which is fine because our own form checks Turnstile, the honeypot and rate limits before Kit is called)
- [x] Redeploy `wotw-web` and `wotw-api` in Production (the new routes and `/thank-you` exist on production only after this). (not needed 2026-11-21: both Production deployments were built from `main` after the routes existed, and the two checks below prove the forwarder and the API route are live)

**H2. Check the forwarder route on production** (the route is dormant at launch, but it must answer safely: public site, then our forwarder, then the protected API)
- [x] `curl -i https://wordonthewater.net/api/webhooks/kit` gives **405** (only POST is accepted). (checked 2026-11-21: 405)
- [x] `curl -i -X POST https://wordonthewater.net/api/webhooks/kit -d '{}'` gives **503**: the forwarder reached the production API, and the API says no webhook secret is set, which is right while no webhook is registered. (checked 2026-11-21: 503) A **502** would mean the forwarder cannot reach the API (check `API_BASE_URL` and `API_BYPASS_SECRET` in `wotw-web` Production); a **401** would mean a secret is set.

**H3. Check the daily Kit sync on production** (after PR #150 is deployed)
- [x] Vercel, `wotw-api`, Settings, Cron Jobs lists `/cron/sync-kit` at `0 3 * * *`. (checked 2026-11-21: the promoted production deployment carries all three crons, `*/5 * * * *` drain, `0 3 * * *` sync and `30 3 * * *` retention)
- [x] Run it once by hand (done by Hendrik 2026-11-21 13:01 UTC from the Cron Jobs page, after the first live sign-up; the result was `{"checked": 1, "updated": 1}` instead of zeros): `curl -H "Authorization: Bearer $CRON_SECRET" -H "x-vercel-protection-bypass: $BYPASS" https://wotw-api.vercel.app/cron/sync-kit` returns `{"checked": N, "updated": M}`. Before the first real sign-up `checked` is the number of subscribers in Kit and `updated` is 0 (the production list was empty on 2026-11-21, so `{"checked": 0, "updated": 0}` is correct).
- [x] After the first real sign-up and confirmation (Part I) (done 2026-11-21: Kit showed the subscriber `active` after confirming, and the sync run logged `kit_synced` with `checked` 1 and `updated` 1, counts only): the next run (or a hand run) gives `updated` of at least 1, and the person is `active` in our table. The logs show `kit_synced` with counts only, no addresses.

**Not done at launch: registering the webhook (needs a paid Kit plan).** If Kit is ever upgraded: run `make kit-webhook URL=https://wordonthewater.net/api/webhooks/kit` (it saves the signing secret in the root `.env` as `KIT_WEBHOOK_SECRET` and never prints it), add the secret to `wotw-api` Production only (Sensitive), redeploy `wotw-api`, check an unsigned POST to the forwarder now gives **401**, and confirm a real delivery shows **200** in Kit's developer settings. The signature format was inferred from Kit's docs and has never seen a real delivery. The daily sync can then stay as a safety net.

---

## Part I. Production smoke test (on the real domain)

- [x] Subscribe with a real address, confirm through the Kit email, land on `/thank-you`; Kit shows `active`; our mirror shows `pending` until the next daily sync (03:00 UTC, or run `/cron/sync-kit` by hand, Part H3), then `active`. (done 2026-11-21 with Hendrik's own address: the confirmation arrived in the normal inbox, Kit showed `active` after confirming, and the sync moved our mirror; whether `/thank-you` appeared after confirming was not reported, so check it once more with the next test address)
- [x] Unsubscribe through the Kit link; Kit shows the person unsubscribed at once and our mirror follows after the next daily sync (Part H3). (done 2026-11-21: Hendrik unsubscribed through the Kit link; Kit showed the subscriber `cancelled` at once, and the sync run at 14:51 UTC logged `checked` 1 and `updated` 1, moving our mirror from active to unsubscribed. Retention keeps unsubscribed rows, so the opt-out stays on record)
- [x] The `hello@wordonthewater.net` mail links on the page ("Talk to someone" while the chat is off, the privacy policy) open a mail to the right address, and a message sent to it arrives. The prayer and contact forms and the `prayer@` address are not on the page at launch; their smoke tests (a prayer request reaches the prayer inbox, text only if the consent box was ticked; a contact message reaches `hello@`) belong to PLAN.md 1.4 and 1.5. (checked 2026-11-21: every mail link on the home page, the privacy page and `/thank-you` is `mailto:hello@wordonthewater.net`, `prayer@` is not on the page, and a test message to `hello@` arrived within 13 seconds, in Gmail's spam folder because of its content filter while SPF, DKIM and DMARC passed; the chat is on, so the "Talk to someone" fallback is not shown)
- [x] A form without the spam check is refused (checked 2026-11-21: the live form refuses a sign-up without the spam-check token, "One moment, the spam check is still running", nothing was sent to Kit and Kit still holds one subscriber).
- [ ] The rate limit answers 429 on repeated sign-ups. Not triggered live, because each attempt would send a real Kit sign-up and a confirmation email; it is covered by the integration tests in CI. The chat limiter is the one to trip live (Part L), which proves the same limiter code. Optional here.
- [x] No personal data or prayer text appears in the logs (checked 2026-11-21: the last 12 hours of Production logs, 52 API records and 4 web records, contain no email-like string and no name; the chat logs carry only the kind of answer, the entry id and the latency, and the starter question text appears in no record).
- [ ] No personal data or prayer text appears in Sentry (Hendrik: open the recent events in the web and API projects and look for an address or any text; only Hendrik can open Sentry).
- [x] `https://wordonthewater.net/privacy` loads and is linked (checked 2026-11-21: `/privacy` is 200; the home page has two links to it, the footer and the line beside the sign-up button, and the devotional page and `/thank-you` link it; the code sends consent version `v2`).
- [ ] A new sign-up shows consent version `v2` in the database (Hendrik, as `app_runtime`: `select consent_text_version, count(*) from subscribers group by 1;`). The test subscriber's row is `unsubscribed`, which the retention job keeps, so it should still be there.
- [x] The share-preview tags and structured data are right on the live site (checked 2026-11-21: `og:image` is an absolute `https://wordonthewater.net/...` address on both pages and the images load (home 1200x630 PNG, 621 KB; the devotional verse card 165 KB), `og:type` is `website` and `article`, and the `Organization`, `WebSite` and `Article` data are present).
- [ ] Share the home page and a devotional in WhatsApp on a phone and check the preview (the default lighthouse image, and the verse card for a devotional). The home image is 621 KB: if WhatsApp shows no picture, shrink it (Hendrik).
- [ ] Paste the home page into Google's Rich Results Test or the Schema.org validator: the `Organization` and `WebSite` data have no errors (Hendrik).
- [ ] Add a `logo` to the Organization data now that the PWA icons exist (Claude: `apps/web/src/lib/seo.ts` says "no logo" until they did; checked 2026-11-21 that the live data has none). Small and optional.
- [x] `https://wordonthewater.net/.well-known/security.txt` loads as plain text with the contact, the canonical address and an `Expires` about a year ahead. (checked 2026-11-21: plain text, `Contact: mailto:hello@wordonthewater.net`, `Canonical` at the live address, `Expires: 2027-11-16`)
- [x] `https://wordonthewater.net/robots.txt` and `/sitemap.xml` load; the sitemap lists only the devotionals that are published today and gains the next one on its publish day without a redeploy. (checked 2026-11-21: both load; the sitemap lists the home page, `/privacy` and only the first devotional, because the site shows the first devotional before any is published (by design, devotional_format.md) and the other four give 404. The sitemap gaining the next one on its publish day without a redeploy is checked on 5 December, post_launch.md)
- [x] Lighthouse mobile on `https://wordonthewater.net` (home page and a devotional): SEO 100 (the one budget a preview cannot prove, because of its `noindex` header), and Performance 95, Accessibility 100 and Best Practices 100 still hold on the live site. (checked 2026-11-21 from Hendrik's machine, mobile profile with real DevTools throttling, 3 runs per page: home Performance 97, Accessibility 100, Best Practices 100, SEO 100; devotional 96, 100, 100, 100. **LCP was 2.09 to 2.20 s, a little over the 2.0 s budget** (CI measured 1.62 s earlier); this is a lab number from one connection, so the real figure comes from Speed Insights after launch, post_launch.md)
- [x] The API project has the three crons and all three have run on production (checked 2026-11-21: the promoted production deployment lists `/cron/sync-kit` (03:00 UTC), `/cron/retention` (03:30 UTC) and `/cron/drain-outbox` (every 5 minutes), and the production logs show the drain on its schedule (31 runs in 12 hours) and the Kit sync and retention run by hand).
- [ ] The day after, the Cron Jobs page shows a successful scheduled run of each (check on 22 November: the 03:00 sync and the 03:30 retention).
- [ ] Send a tag-limited test broadcast from `hello@` and read it (Part K).
- [x] No console errors and no CSP violations on the production domain (checked 2026-11-21 with a real browser: no console messages at all on the home page, a devotional, the Bible reader and `/privacy`, in light and in dark; opening the chat and asking a starter question worked end to end and added none. The only errors, 7 errors and 6 warnings, come from inside Cloudflare's own Turnstile frame (`challenges.cloudflare.com`, under Cloudflare's own CSP) when the sign-up form loads; none are from our pages and the token was issued).
- [ ] Both colour schemes reviewed end to end on a real phone and on a desktop browser (Hendrik).

---

## Part J. Exit gate and after launch

The launch exit gate. Work that continues after launch (and everything else we decided to do later) is tracked in [post_launch.md](post_launch.md); some of its first-week items repeat here on purpose.

- [ ] A visitor on a mid-range phone can read the page, subscribe and confirm, and reach `hello@` through the mail link (the forms and the `prayer@` address are deferred, PLAN.md 1.4 and 1.5).
- [ ] All Part A budgets met and no high security findings.
- [ ] Part K is complete: the first weekly email reached a real inbox (not spam), from `hello@`, with the banner, the unsubscribe link and a working "Read it on the website" link.
- [ ] Alerts are set up and each one has been seen to fire once ([runbooks/alerts.md](runbooks/alerts.md)).
- [ ] **After about a day of real traffic:** both Firewall rules (sign-up and chat, [runbooks/deploy.md](runbooks/deploy.md)) are on Log; look at the Firewall traffic view for anything legitimate that was caught, then switch each rule to Too Many Requests (429), publish, and note the date here.
- [ ] **First week after launch:** `kit_synced` shows in the API logs every day (counts only), and subscribers who confirmed are `active` in our table. If the first sign-ups reach 7 days still `pending` while Kit shows them active, the sync is not working: stop and look (the retention job deletes pending rows after 7 days).
- [ ] **Monthly:** in the Kit dashboard, delete the subscribers that are still unconfirmed after 7 days (Subscribers, filter Unconfirmed). The retention job cannot do this: Kit's API has no delete (see [privacy.md](privacy.md)).
- [ ] **Accepted advisories lapse soon after launch:** `GHSA-3g3m-2fjr-6pw4` (glob, 2026-12-01, three days after launch), `GHSA-fc5q-39xc-vjpf` (picomatch, high severity, dev-only, no fix yet, 2026-12-15, in `osv-scanner.toml` and `pnpm-workspace.yaml`) and `GHSA-g3hv-75wg-m249` (minimatch, 2026-12-31, only in `osv-scanner.toml`, which is why `pnpm audit` still lists it as moderate). Re-check each before it lapses, then remove its entry everywhere or extend it with a new reason.
- [ ] Two weeks after launch: review the DMARC reports, then move DMARC to `p=quarantine`.
- [ ] Revisit the accepted risks: delivery through Squarespace forwards and DMARC at `p=none` in the first weeks.
- [ ] If the chat launched (Part L): the share of `no_answer` and `clarify` outcomes reviewed weekly for the first month, and weak or missing questions added to the knowledge base by pull request (`make kb`, `make kb-check`).
- [ ] Tell Claude Code, so it ticks the matching items in PLAN.md and the threat plan and closes Phase 1.

---

## Part K. Weekly email broadcasts (Kit)

How it works is in [devotional_format.md](devotional_format.md), "The weekly email (Kit)", and what was proven is in [ADR 0008](adr/0008-kit-subscriptions.md), "Broadcast spike". In short: `pnpm broadcast:devotional <folder> --tag <id>|--all` creates a **draft** in Kit; nothing is sent until you schedule it in Kit. The command runs on your own machine from the root `.env`, not on Vercel.

**One-time, before the first broadcast**
- [x] Part E is done for Kit (2026-11-15, [kit_setup.md](archive/kit_setup.md)): sending domain authenticated (DKIM signed as `wordonthewater.net`), SPF covered by the return-path CNAME, and `p=reject` kept.
- [ ] **Run one draft test** (steps and the error table in [kit_email_devotional.md](kit_email_devotional.md)): `EMAIL_IMAGE_BASE=https://raw.githubusercontent.com/thecodeblock-hendrik/word-on-the-water/main/apps/web/public/email pnpm broadcast:devotional advent-02-the-long-wait --tag 25869858` in `apps/web`. The test tag `spike-test` (id 25869858) is carried by the owner's own address (set 2026-11-17); the banner check refuses to make a draft against the real address until the site is live.
- [ ] Prove delivery from `hello@`: create a draft with `--tag <id>` for a tag that only you carry, send it, and check it lands in the inbox, not spam. In Gmail, "Show original" must say SPF, DKIM and DMARC pass. (The spike sent from a Gmail address as a workaround and landed in spam; that workaround is not needed once DKIM is set.)
- [ ] Read the test on a phone in the Mail app and the Gmail app, with dark mode on and off, and in Outlook if you can: the banner shows, the dark panels hold, quotes and "Paddle Out" are styled, and the dashes, quotes and © are correct.
- [ ] **Banner address (decided 2026-11-17, option C).** The email loads the series banner (`advent-banner.jpg`, 1200 x 677, 52 KB) from the site's own fixed address, `https://wordonthewater.net/email/advent-banner.jpg` (a plain file in `apps/web/public/email`, named by `emailBanner` in `series.yml`), never from a branch. This replaced the GitHub `main` address after the first test email lost its image when the branch it pointed at was deleted. After Part G, open that address in a browser, and note that `pnpm broadcast:devotional` refuses to make a draft until it answers. Every new series needs its own banner (crop the art wide, resize to 1200 px, JPEG under 100 KB) and an `emailBanner` line. Steps: [kit_email_devotional.md](kit_email_devotional.md).
- [ ] After Part G, the "Read it on the website" link (`SITE_URL`, default `https://wordonthewater.net`) opens the devotional. Click it in the test email.
- [ ] Kit account settings: timezone (set to Harare, UTC+2, 2026-11-14), the postal address Kit prints in the footer is the one you want public (it shows "PO Box 6055, Port Elizabeth, Eastern Cape 6001"), default sender `hello@wordonthewater.net`.
- [ ] Decide about the "Built with Kit" badge. The free plan adds it below every email and it cannot be restyled; a paid plan removes it.
- [ ] **Clean up the spike leftovers in Kit before real subscribers arrive**, so the first `--all` goes only to real people: any extra test subscribers (keep your own address), the empty "Imported November 14th, 2026…" tag (**keep the `spike-test` tag, id 25869858: your own address carries it and it is the permanent test audience for [kit_email_devotional.md](kit_email_devotional.md)**), and the sent test broadcasts (ids 27039425, 27039513, 27039763, 27040594; the API cannot delete a sent broadcast, use the Kit dashboard).
- [ ] Keys: the command uses `KIT_API_KEY_PREVIEW` (add `--live` for `KIT_API_KEY`). Both belong to the same Kit account, so a draft appears in the live account either way. Keep the keys in the root `.env` only, never in the repo, chat or a Vercel variable for this command.

**The first real broadcast (`advent-01-more-than-watchmen`, publishAt Saturday 2026-11-28, the launch date)**
- [ ] A few days before, run `pnpm broadcast:devotional advent-01-more-than-watchmen --all`, open the draft in Kit and check the subject (`emailSubject`), the preview text (`summary`) and the sender.
- [ ] Send yourself a test from Kit and read it on your phone.
- [ ] Schedule it in Kit for 2026-11-28 after 02:00 Harare time (the page goes live at 00:00 UTC), so the website link works when readers tap it.
- [ ] Check the unsubscribe link in the test: Kit shows `unsubscribed` and our mirror follows after the next daily sync (Part H3).

**After the first send**
- [ ] In Kit's report, check recipients, opens, unsubscribes, bounces and complaints, and that bounces and complaints reached our mirror after the next daily sync.
- [ ] Read the first DMARC reports and confirm Kit's mail passes, then continue with the `p=quarantine` step in Part J.
- [ ] From the second week on, follow the four steps in [devotional_format.md](devotional_format.md).

---

## Part L. Got Questions chat (only if it launches with the site)

Scope: [chat.md](archive/chat.md), decision: [ADR 0009](adr/0009-chat-local-knowledge-base.md). No domain or external service is needed, so this part can be done on a preview first.

- [x] **Crisis numbers verified** on the providers' own sites (2026-11-15): SADAG Suicide Crisis Helpline 0800 567 567 (24 hours, sadag.org) and LifeLine South Africa National Counselling Line 0861 322 322 (24 hours, shared-rate call, lifeline.org.za); the text for visitors outside South Africa is "call your local emergency number". Re-check the day before launch.
- [x] `make kb-check` is green in CI (committed JSON equals the markdown source; it runs in `ci.yml` and was green on PR #112).
- [x] Privacy notice has the chat section (no storage on the server, thread only in the tab) and the threat model rows C1 to C9 are ticked (2026-11-15).
- [ ] On a preview with `CHAT_ENABLED=1`: ask the starter questions, a contested one (baptism), an off-topic one, a message with a phone number (rejected) and a crisis phrase (fixed reply); try follow-ups ("tell me more", "why"); press Clear chat; reload (thread survives) and close the tab (thread gone).
- [x] Phone check at 375px on a real device: keyboard, safe areas, tap targets, dark and light (done by hand, 2026-11-15, with the keyboard, VoiceOver and TalkBack pass).
- [ ] Rate limit seen to trip (generic 429) and the Vercel Firewall rule on the chat route is set.
- [ ] Set `CHAT_ENABLED=1` in Production, redeploy **(Hendrik)**, and check the Got Questions button opens the chat. Rollback is unsetting the variable: the button then is a mail link to `hello@wordonthewater.net`. Checked 2026-11-16: the flag is set in Production on both Vercel projects, and the web Production deployment shows the Got Questions button (and serves `/bible`); opening the chat from it, and the API side, still need your check, so this stays unticked.
