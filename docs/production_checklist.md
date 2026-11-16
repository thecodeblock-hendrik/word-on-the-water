# Production checklist (just before launch)

**Launch date: Saturday 28 November 2026.** Everything that is only needed when the site goes public lives here, not in [PLAN.md](PLAN.md). It was moved out of PLAN.md step 1.9, the launch parts of 1.3, 1.6 and 1.8, and the launch items of the old threat plan and webhook guide (both now in [archive/](archive/)), so the rest of the plan can be finished first. Everything outstanding that is **not** about launch lives in [PLAN.md](PLAN.md).

**`wordonthewater.net` stays inactive until Part G.** Parts A to F do not point the website at Vercel: the old Squarespace site keeps serving. Part E adds email DNS records only; the mailboxes (MX) are never touched.

Do not start this list until steps 1.3 to 1.8 in PLAN.md are ticked. Tick each box here and note the date. Never paste a secret into chat or the repo.

Related guides: [PWA_checklist.md](PWA_checklist.md) (the PWA, step by step), [runbooks/deploy.md](runbooks/deploy.md), [runbooks/alerts.md](runbooks/alerts.md). The domain and webhook steps that used to be a separate guide are now Parts G and H below.

---

## Part A. Gate: is the rest done?

- [ ] PLAN.md steps 1.3, 1.6, 1.7 and 1.8 are all ticked (sign-up, legal and SEO, retention, quality gates). The prayer form (1.4) and contact form (1.5) are deferred past launch (decided 2026-11-14).
- [ ] Budgets met on a deployed preview: Lighthouse mobile (Performance 95, Accessibility 100, Best Practices 100, SEO 100), LCP under 2.0 s, CLS under 0.05, INP under 200 ms, landing JS under 165 KB gzipped ([ADR 0010](adr/0010-landing-js-budget.md)).
- [ ] No unresolved high or critical finding in CodeQL, the dependency audits or gitleaks.
- [ ] **Privacy policy:** the responsible name (the registered name, Word On The Water) and the postal address (PO Box 6055, Port Elizabeth, Eastern Cape 6001, the same one Kit prints) are filled in (2026-11-14). Still to do: read the whole page once, update `PRIVACY_UPDATED` if you change anything, and fill the two social handles so that `pnpm check:placeholders` passes.
- [ ] **Content decisions (Hendrik):** the two social handles for the footer (`footer.social.*`; a channel with no address stays hidden), a pastor or elder reads "Start here" (the gospel in 4 steps), and `pnpm check:placeholders` in `apps/web` reports nothing (no `[brackets]` on the live page).
- [ ] **Privacy decisions still open (Hendrik, from [privacy.md](privacy.md)):** which regulator and jurisdiction to name first; the Upstash region and which mailbox provider receives the `hello@` forward; a data processing agreement accepted with each provider listed in the policy.
- [ ] Kit: add a link to `https://wordonthewater.net/privacy` to the Kit form's sign-up and confirmation pages if Kit allows it (the site's own sign-up line already links it).
- [ ] Got Questions chat (PLAN.md 1.10): either ready for Part L, or left off with `CHAT_ENABLED` unset and the button a mail link to `hello@wordonthewater.net`.

---

## Part B. Accounts and owner hardening (no domain needed)

- [ ] Vercel: upgrade to **Pro** (Hobby is non-commercial and has quota limits).
- [ ] Vercel: restrict who can promote to production; two-factor on every team member; turn on the **audit log** (Pro).
- [ ] Two-factor on Squarespace (domain and DNS) and the registrar lock on.
- [ ] Two-factor on GitHub, Vercel, Neon, Upstash, Kit and Squarespace (Postmark when it is set up), threat E4.
- [ ] Recovery codes for every account stored offline.
- [ ] Rotate any secret that was ever shown in a chat, a screenshot or a log ([runbooks/rotate-secrets.md](runbooks/rotate-secrets.md)).
- [ ] With Pro: a log drain to a log store (Better Stack or Axiom) and a staging environment (a custom Vercel environment), deferred from step 0.10.
- [ ] Outbox cron changed to `*/5 * * * *` in `apps/api/vercel.json` and in the deploy runbook (Hobby fails the deploy with anything more frequent than daily).
- [ ] Vercel Firewall rate-limit rules on the sign-up route and on `/v1/chat/messages` (the prayer and contact routes when those forms are built); Attack Challenge Mode noted in the incident runbook.

---

## Part C. Convert the site to a PWA

Do this on a branch and test it on a preview before launch. The detailed steps, with decisions to confirm first, are in [PWA_checklist.md](PWA_checklist.md). Scope: installable and full-screen with the right icon, name and colours. Not offline reading or push messages (later phases).

- [ ] `app/manifest.ts` (`MetadataRoute.Manifest`, read `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` first): `name`, `short_name` ("Word on the Water" and "WotW"), `description`, `id` and `start_url` `/`, `scope` `/`, `display: "standalone"`, `orientation: "portrait"`, `lang: "en"`, `categories`, and `background_color` and `theme_color` from the design tokens
- [ ] Icons: 192 and 512 px PNG (`purpose: "any"`), a 512 px maskable icon with the logo inside the safe zone, `app/icon.svg` as favicon, and `app/apple-icon.png` (180 px) for iOS home screens, generated from the inline SVG logo
- [ ] Manifest `shortcuts` to the sections people return to ("Start here"; "Prayer request" is added when that feature is built) and `screenshots` (narrow, 375 px) for the richer Android install sheet
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
- [ ] ZAP baseline scan against staging: no high findings. The weekly `zap.yml` job already scans a local production build (PR #117); this repeats it against staging once Pro gives us one.
- [ ] Re-check the Done threat items on the deployed site (threat model S1, S2, S4, T4, E1): calls without the service token or `CRON_SECRET` give 401, a forged `X-Client-IP` is ignored, CI security workflows are green, `app_runtime` cannot run DDL.
- [ ] The retention job (PLAN.md 1.7) runs on the production cron.

---

## Part E. Email authentication (adds DNS records only; the website is not switched)

These are TXT and CNAME records in **Squarespace DNS** for `wordonthewater.net`. The MX records (the `hello@` and `prayer@` forwards) are never changed. There must be only **one** SPF record: edit the existing one, never add a second.

- [x] SPF: no change needed for Kit (done 2026-11-15, [kit_setup.md](archive/kit_setup.md)): Kit's return-path CNAME `ckespa` covers its SPF, so the existing `v=spf1 include:mailgun.org ~all` stays as it is. Never add a second SPF record.
- [x] DKIM for Kit: done 2026-11-15, two CNAMEs (`cka._domainkey`, `cka2._domainkey`) in Squarespace DNS, signed as `d=wordonthewater.net`. DKIM for Postmark waits for the prayer and contact forms (steps in [kit_setup.md](archive/kit_setup.md)).
- [x] Return-path for Kit: done 2026-11-15 (`ckespa` CNAME). Postmark's return-path comes with Postmark, after launch.
- [ ] DMARC at `_dmarc.wordonthewater.net`: found 2026-11-14 already published as `p=reject; adkim=s; aspf=s` with reports to Mailgun and a second address, not the `p=none` this list assumed. Until Kit and Postmark are signed with DKIM for `wordonthewater.net`, their mail from `hello@` is very likely rejected (a Kit confirmation never reached Gmail). Decided 2026-11-15: keep `p=reject` and leave the record untouched (it belongs to the Squarespace email forwarding preset); Kit's DKIM aligns with `adkim=s`, and a test passed SPF, DKIM and DMARC. The report addresses are Squarespace's and Mailgun's, not a person's, so reports are not read by us.
- [x] Kit: sending domain `wordonthewater.net` verified, default sender `hello@wordonthewater.net`; a test broadcast reached the Gmail inbox with SPF, DKIM and DMARC all PASS (2026-11-15, [kit_setup.md](archive/kit_setup.md)). **Still to do:** a real sign-up through the live form with a fresh address (confirmation arrives, link works), the confirmation email branded, and delete the test and SPIKE draft broadcasts in Kit.
- Postmark (sender signature, DNS records, the test to `hello@` and `prayer@`) is not part of the launch: the prayer and contact forms are deferred, and Kit sends every launch email. The steps moved to PLAN.md 1.4.

---

## Part F. Production configuration (still no domain switch)

- [ ] `wotw-api` Production variables set: `EMAIL_FROM=Word on the Water <hello@wordonthewater.net>`, `KIT_API_KEY`, `KIT_FORM_ID` and `TURNSTILE_SECRET_KEY` (Sensitive where Vercel allows). `PRAYER_INBOX`, `CONTACT_INBOX`, `POSTMARK_SERVER_TOKEN`, `EMAIL_PROVIDER=postmark` and the prayer encryption key come with steps 1.4 and 1.5 (PLAN.md). Preview keeps its test values.
- [ ] Public site URL `https://wordonthewater.net` set for metadata, the sitemap and links in email.
- [ ] Production Kit: the real form with double opt-in on, and the production `KIT_API_KEY` and `KIT_FORM_ID` in Production only. Preview and Development use the Kit test form and key (or a separate Kit account), never the production key now that real subscribers exist.
- [ ] Production uses only the production Turnstile widget keys (the API refuses Cloudflare's test secrets in production by design). `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set for Production, and `wotw-web` is redeployed after it was added (the value is built into the site).
- [ ] The Cloudflare Turnstile production widget lists only `wordonthewater.net` and `www.wordonthewater.net`. It will refuse any `*.vercel.app` address (error 110200), so the production smoke test must run on the real domain.
- [ ] Tokens match in `wotw-web` and `wotw-api` Production (`SERVICE_TOKEN`), and `API_BYPASS_SECRET` is set in `wotw-web` Production.
- [ ] Production database is on the current migration with no test data, and the production and preview roles have different passwords.

---

## Part G. Go live: attach the domain (this switches the website)

**Attaching `wordonthewater.net` to Vercel replaces the Squarespace site with the new site.** Do this only when you are happy for the new site to be public. Email is not affected as long as the MX records are left alone (`hello@` and `prayer@` keep forwarding). Never paste a secret into chat or the repo.

- [ ] A production deployment of `wotw-web` built from the latest `main` is **Ready** (Vercel, `wotw-web`, Deployments, filter Production; if the newest is Cancelled or old, three dots on the latest Ready one, then **Redeploy**). Have Squarespace and Vercel open in two tabs.

**G1. Save the old DNS so you can undo**
- [ ] Squarespace, Domains, `wordonthewater.net`, DNS Settings: screenshot **every** record (A, CNAME, MX, TXT) and keep it safe.
- [ ] Note the MX records and every TXT record starting `v=spf1`: you will not touch them.

**G2. Add the domain in Vercel**
- [ ] `wotw-web`, Settings, Domains, Add: `wordonthewater.net` attached to **Production**, and `www.wordonthewater.net` set to **redirect to** `wordonthewater.net` (apex is primary).
- [ ] Vercel shows "Invalid configuration" and lists the records it needs (an **A record** for the apex and a **CNAME** for `www`). Copy the exact values from that page; do not type them from memory.
- [ ] `wotw-api` stays on its protected `vercel.app` address.

**G3. Change the records in Squarespace**
- [ ] Replace the existing apex (`@`) A records and the `www` record that point at Squarespace with the values Vercel showed. If Squarespace marks some as "Squarespace defaults" for the website, remove those for the apex and `www` only.
- [ ] Do **not** change the MX records, the SPF TXT record or any DKIM or DMARC record (the Kit `ckespa`, `cka._domainkey` and `cka2._domainkey` CNAMEs stay too). Save.

**G4. Check it**
- [ ] After a few minutes (up to a few hours for DNS) both Vercel domain rows show **Valid Configuration** and a certificate.
- [ ] `https://wordonthewater.net` shows the new site; `https://www.wordonthewater.net` redirects to it; HTTPS and the HSTS header check out on both.
- [ ] A test email to `hello@wordonthewater.net` and one to `prayer@wordonthewater.net` still arrive in your mailbox.
- [ ] To go back: restore the A and CNAME records from the G1 screenshot.

---

## Part H. Kit form redirect and webhook

Kit tells our site when a subscriber confirms, unsubscribes, bounces or complains, so our database mirror stays right. The route is built (`/api/webhooks/kit` on `wotw-web`, forwarding to `wotw-api`). Kit can only reach a **public** address, so the webhook is registered for production, on the real domain, after Part G.

**H1. Redirect and redeploy**
- [ ] Kit production form: set the redirect after sign-up and after confirmation to `https://wordonthewater.net/thank-you`.
- [ ] Redeploy `wotw-web` and `wotw-api` in Production (the new routes and `/thank-you` exist on production only after this).

**H2. Check the route on production before registering** (the chain is public site, then our forwarder, then the protected API)
- [ ] `curl -i https://wordonthewater.net/api/webhooks/kit` gives **405** (only POST is accepted).
- [ ] `curl -i -X POST https://wordonthewater.net/api/webhooks/kit -d '{}'` gives **503**. That is good: the forwarder reached the production API and the API says no webhook secret is set yet.
- [ ] **502** instead means the forwarder cannot reach the API: check `API_BASE_URL` and `API_BYPASS_SECRET` in `wotw-web` Production and redeploy. **401** means the secret is already set (fine).

**H3. Register the webhook in Kit**
- [ ] The root `.env` holds the Kit API key of the account that owns the production list (`KIT_API_KEY`; Kit webhooks are account-wide).
- [ ] From the repo root: `make kit-webhook URL=https://wordonthewater.net/api/webhooks/kit`. Expect `Registered Kit webhook <id>. The signing secret is saved in .env as KIT_WEBHOOK_SECRET.` (the secret is not printed).
- [ ] If it says the address is already registered, delete that endpoint in Kit's developer settings (webhooks) and run it again (Kit shows a secret only when it is created).
- [ ] Kit, developer settings, webhooks: the endpoint is listed with `subscriber.activated`, `.unsubscribed`, `.bounced` and `.complained`.

**H4. Put the secret in Vercel (`wotw-api`, Production only)**
- [ ] Copy it without showing it: `grep '^KIT_WEBHOOK_SECRET=' .env | cut -d= -f2- | pbcopy`.
- [ ] `wotw-api`, Settings, Environment Variables, Add: `KIT_WEBHOOK_SECRET`, paste, **Production only**, **Sensitive** on, save. Then clear the clipboard: `pbcopy </dev/null`. Never add it to Preview (a preview must not hold the production secret; Kit cannot reach previews anyway).
- [ ] Redeploy `wotw-api` in Production (a new variable reaches only a new deployment), wait for Ready.
- [ ] `curl -i -X POST https://wordonthewater.net/api/webhooks/kit -d '{}'` now gives **401** (the API refuses an unsigned call). 401 instead of 503 proves the secret is in place.

**H5. Confirm with a real delivery** (the signature key format was inferred from Kit's docs and has never seen a real delivery)
- [ ] Cause an event in Kit: confirm or unsubscribe a **test** subscriber, or sign up and confirm once the redirect is set.
- [ ] Kit, developer settings, webhooks: the endpoint's recent deliveries show **200**. **401** means the signature check failed (likely the secret format; the API logs for `/v1/webhooks/kit` show why). **502 or 503** means the API was unreachable or had no secret: re-check H4.
- [ ] Tell Claude Code a delivery went through, so it reads the API logs (expect a 200) and ticks the PLAN.md 1.3 items.

---

## Part I. Production smoke test (on the real domain)

- [ ] Subscribe with a real address, confirm through the Kit email, land on `/thank-you`; Kit shows `active` and our mirror shows the same.
- [ ] Unsubscribe through the Kit link; our mirror shows `unsubscribed`.
- [ ] Deferred past launch (forms not built): the `prayer@` and `hello@` mail links on the page open a mail to the right address. When the prayer form ships, send one and check the prayer inbox receives it (the text only if the consent box was ticked).
- [ ] Send a contact message: it arrives in `hello@`.
- [ ] The rate limit answers 429 on repeated sign-ups, and a form without the spam check is refused.
- [ ] No personal data or prayer text appears in the logs or Sentry.
- [ ] `https://wordonthewater.net/privacy` loads; the footer link on any page and the "privacy policy" link beside the sign-up button both reach it, and a new sign-up shows consent version `v2` in the database.
- [ ] Share the home page and a devotional in WhatsApp and check the preview (the default lighthouse image, and the verse card for a devotional); `og:image` is an absolute `https://wordonthewater.net/...` address (in development it shows `localhost` by design). Paste the home page into Google's Rich Results Test or the Schema.org validator: the `Organization` and `WebSite` data have no errors. Once the PWA icons exist, add a `logo` to the Organization data.
- [ ] `https://wordonthewater.net/.well-known/security.txt` loads as plain text with the contact, the canonical address and an `Expires` about a year ahead.
- [ ] `https://wordonthewater.net/robots.txt` and `/sitemap.xml` load; the sitemap lists only the devotionals that are published today and gains the next one on its publish day without a redeploy.
- [ ] Vercel, the API project, Cron Jobs lists `/cron/retention` (03:30 UTC) and `/cron/drain-outbox` (05:00 UTC). Trigger each once by hand with `curl -H "Authorization: Bearer $CRON_SECRET" https://wotw-api.vercel.app/cron/retention` (with the protection bypass header) and read the counts; the day after, the Cron Jobs page shows a successful run.
- [ ] Send a tag-limited test broadcast from `hello@` and read it (Part K).
- [ ] No console errors and no CSP violations on the production domain; both colour schemes reviewed end to end on a real phone and a desktop browser.

---

## Part J. Exit gate and after launch

- [ ] A visitor on a mid-range phone can read the page, subscribe and confirm, and reach `prayer@` and `hello@` through the mail links (the forms are deferred).
- [ ] All Part A budgets met and no high security findings.
- [ ] Part K is complete: the first weekly email reached a real inbox (not spam), from `hello@`, with the banner, the unsubscribe link and a working "Read it on the website" link.
- [ ] Alerts are set up and each one has been seen to fire once ([runbooks/alerts.md](runbooks/alerts.md)).
- [ ] **Monthly:** in the Kit dashboard, delete the subscribers that are still unconfirmed after 7 days (Subscribers, filter Unconfirmed). The retention job cannot do this: Kit's API has no delete (see [privacy.md](privacy.md)).
- [ ] Two weeks after launch: review the DMARC reports, then move DMARC to `p=quarantine`.
- [ ] Revisit the accepted risks: delivery through Squarespace forwards and DMARC at `p=none` in the first weeks.
- [ ] If the chat launched (Part L): the share of `no_answer` and `clarify` outcomes reviewed weekly for the first month, and weak or missing questions added to the knowledge base by pull request (`make kb`, `make kb-check`).
- [ ] Tell Claude Code, so it ticks the matching items in PLAN.md and the threat plan and closes Phase 1.

---

## Part K. Weekly email broadcasts (Kit)

How it works is in [devotional_format.md](devotional_format.md), "The weekly email (Kit)", and what was proven is in [ADR 0008](adr/0008-kit-subscriptions.md), "Broadcast spike". In short: `pnpm broadcast:devotional <folder> --tag <id>|--all` creates a **draft** in Kit; nothing is sent until you schedule it in Kit. The command runs on your own machine from the root `.env`, not on Vercel.

**One-time, before the first broadcast**
- [x] Part E is done for Kit (2026-11-15, [kit_setup.md](archive/kit_setup.md)): sending domain authenticated (DKIM signed as `wordonthewater.net`), SPF covered by the return-path CNAME, and `p=reject` kept.
- [ ] Prove delivery from `hello@`: create a draft with `--tag <id>` for a tag that only you carry, send it, and check it lands in the inbox, not spam. In Gmail, "Show original" must say SPF, DKIM and DMARC pass. (The spike sent from a Gmail address as a workaround and landed in spam; that workaround is not needed once DKIM is set.)
- [ ] Read the test on a phone in the Mail app and the Gmail app, with dark mode on and off, and in Outlook if you can: the banner shows, the dark panels hold, quotes and "Paddle Out" are styled, and the dashes, quotes and © are correct.
- [ ] **Banner address.** The email loads the series banner (`art-night-swell-email.jpg`, 1200 x 677, 52 KB) from `SERIES_IMAGE_BASE` in `apps/web/src/lib/devotionals/kit-broadcast.ts`, which is the public repository on `main`. That works before launch but is not meant for heavy hotlinking: decide whether to keep it for a small list or point `EMAIL_IMAGE_BASE` at the live site's content address once Part G is done. Every new series needs its own email banner in its folder (crop the art wide, resize to 1200 px, JPEG under 100 KB).
- [ ] After Part G, the "Read it on the website" link (`SITE_URL`, default `https://wordonthewater.net`) opens the devotional. Click it in the test email.
- [ ] Kit account settings: timezone (set to Harare, UTC+2, 2026-11-14), the postal address Kit prints in the footer is the one you want public (it shows "PO Box 6055, Port Elizabeth, Eastern Cape 6001"), default sender `hello@wordonthewater.net`.
- [ ] Decide about the "Built with Kit" badge. The free plan adds it below every email and it cannot be restyled; a paid plan removes it.
- [ ] **Clean up the spike leftovers in Kit before real subscribers arrive**, so the first `--all` goes only to real people: the test subscriber(s), the `spike-test` tag, the empty "Imported November 14th, 2026…" tag, and the sent test broadcasts (ids 27039425, 27039513, 27039763, 27040594; the API cannot delete a sent broadcast, use the Kit dashboard).
- [ ] Keys: the command uses `KIT_API_KEY_PREVIEW` (add `--live` for `KIT_API_KEY`). Both belong to the same Kit account, so a draft appears in the live account either way. Keep the keys in the root `.env` only, never in the repo, chat or a Vercel variable for this command.

**The first real broadcast (`advent-01-more-than-watchmen`, publishAt Saturday 2026-11-28, the launch date)**
- [ ] A few days before, run `pnpm broadcast:devotional advent-01-more-than-watchmen --all`, open the draft in Kit and check the subject (`emailSubject`), the preview text (`summary`) and the sender.
- [ ] Send yourself a test from Kit and read it on your phone.
- [ ] Schedule it in Kit for 2026-11-28 after 02:00 Harare time (the page goes live at 00:00 UTC), so the website link works when readers tap it.
- [ ] Check the unsubscribe link in the test: Kit shows `unsubscribed` and our mirror follows through the webhook (Part H).

**After the first send**
- [ ] In Kit's report, check recipients, opens, unsubscribes, bounces and complaints, and that bounces and complaints reached our mirror.
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
- [ ] Set `CHAT_ENABLED=1` in Production, redeploy **(Hendrik)**, and check the Got Questions button opens the chat. Rollback is unsetting the variable: the button then is a mail link to `hello@wordonthewater.net`.
