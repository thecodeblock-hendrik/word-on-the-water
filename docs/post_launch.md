# Post-launch list

Everything we decided on to do **after** the launch on Saturday 28 November 2026, in one place so you can action it. Tick a box when it is done and note the date. Launch-day work stays in [production_checklist.md](production_checklist.md); step-by-step plans for the bigger features stay in [PLAN.md](PLAN.md) and the feature documents linked below.

Written 2026-11-21. "Who" says whose hands the step needs: **Hendrik** (dashboards, accounts, decisions) or **Claude** (code and documents).

---

## 1. First week after launch (time-boxed)

- [ ] **Alert when sign-ups stop reaching Kit** (Claude; do first, before launch if time allows). On 2026-11-21 every live sign-up failed for about an hour because Kit answered 401 to the Production API key, and nothing alerted us. Test first: (1) `KitClient` raises a `KitAuthError` on 401 and 403; (2) `drain_outbox` sends one Sentry message with the fixed text "Kit rejected the API key" as soon as a run sees one (no address, no count); (3) a Sentry alert rule "a new issue is created" for that title, emailed to Hendrik, tried once with a wrong key on a preview; (4) after any change to `KIT_API_KEY`, redeploy, promote and watch the first sign-up reach Kit (201 in the API logs). Optional: a heartbeat that fires if `kit_synced` has not been logged for 26 hours. Also record it in [runbooks/alerts.md](runbooks/alerts.md) (the row exists; update it when built) and threat model K10.
- [ ] **Daily Kit sync is working** (Hendrik, Claude reads the logs): `kit_synced` appears in the API logs every day, and people who confirmed are `active` in our table. If the first sign-ups reach 7 days still `pending` while Kit shows them active, stop and look: the retention job deletes pending rows after 7 days (production_checklist.md, Part J).
- [ ] **Firewall rules from Log to 429** (Hendrik), after about a day of real traffic: look at the Firewall traffic view for anything legitimate that was caught, then switch "Rate limit sign-up" and "Rate limit chat" to Too Many Requests (429), publish, and note the date ([runbooks/deploy.md](runbooks/deploy.md), "Firewall rules").
- [ ] **Speed Insights: real-user LCP and INP** (Hendrik, Claude reads): the live Lighthouse run on 2026-11-21 gave LCP 2.09 to 2.20 s against the 2.0 s budget (CI measured 1.62 s), from one connection. After a week of real traffic read Speed Insights; if LCP stays above 2.0 s on mobile, look at the hero image and the fonts first (production_checklist.md, Part I, Lighthouse).
- [ ] **5 December: the next devotional appears by itself** (Claude checks): `advent-02-the-long-wait` should be in `/sitemap.xml` and open without a redeploy on its publish day, and 404 before it. The same on 12 and 19 December.
- [ ] **Chat outcomes reviewed weekly for the first month** (Hendrik, Claude): the share of `no_answer` and `clarify` replies; add weak or missing questions to the knowledge base by pull request (`make kb`, `make kb-check`, [runbooks/chat.md](runbooks/chat.md)).
- [ ] **Promote after every merge** (Hendrik): production auto-promotion is off, so each new production build of `wotw-api` and `wotw-web` is promoted by hand (production_checklist.md, Part D).

## 2. Accepted risks that lapse or need a second look

- [ ] **Accepted advisories expire** (Claude, with Hendrik's go-ahead): `GHSA-3g3m-2fjr-6pw4` (glob) on **2026-12-01**, `GHSA-fc5q-39xc-vjpf` (picomatch, high severity, dev-only, no fix yet) on **2026-12-15**, in `osv-scanner.toml` and `pnpm-workspace.yaml`, and `GHSA-g3hv-75wg-m249` (minimatch) on **2026-12-31**, only in `osv-scanner.toml`. Re-check each; remove the entry when a fixed version exists.
- [ ] **Two weeks after launch: DMARC** (Hendrik): read the DMARC reports (they go to the two `rua` addresses in the record, at `dmarc.mailgun.org` and `ondmarc.com`) and confirm Kit's mail passes. The record is already `p=reject` with strict alignment, so the older plan to start at `p=none` and move to `p=quarantine` no longer applies: keep `p=reject` if Kit and the forwarded mail pass, and only relax it if real mail is being rejected.
- [ ] **Revisit the accepted risks** (Hendrik): delivery through Squarespace forwards (test mail landed in Gmail spam once, with SPF, DKIM and DMARC passing; a Gmail filter "never send to spam" for `hello@` and `prayer@` helps), and the Squarespace forwarding itself.
- [ ] **Playwright 1.65** (Claude): `@playwright/test` is held at 1.64.1 because 1.65.0's Firefox crashed four tests. When a newer release passes, restore the caret range and remove the Dependabot ignore for 1.65.x ([CLAUDE.md](../CLAUDE.md) section 14).
- [ ] **Monthly: delete unconfirmed Kit subscribers** (Hendrik): in Kit, Subscribers, filter Unconfirmed, delete those older than 7 days. Kit's API has no delete ([privacy.md](privacy.md)).
- [ ] **Turnstile preview widget hostnames** (Hendrik, optional): check which hostnames the preview widget lists; a per-deployment preview address was refused with error 110200 on 2026-11-17 (production_checklist.md, Part F).

## 3. Operations and infrastructure

- [ ] **`migrate.yml`: production migrations by GitHub Action** (Claude builds, Hendrik sets up the Environment), **before Phase 2 adds tables**. It runs `alembic upgrade head` against production with the direct `app_migrator` URL after a manual approval (a GitHub Environment with you as required reviewer, the migrator password and direct Neon address as its secrets), before you promote the builds that need the change. Pin actions to commit SHAs, add a dry run against a preview database. Until then migrations run by hand ([runbooks/deploy.md](runbooks/deploy.md), "Migrations"): apply first, promote second.
- [ ] **A staging environment** (Hendrik, Claude). Simplest route: a long-lived `staging` git branch (a preview with the stable address `wotw-web-git-staging-thecodeblock.vercel.app`, a persistent Neon branch `preview/staging`, the existing preview wiring), with `CSP_REPORT_ONLY=1` as a Preview variable limited to that branch. A Vercel custom environment (one included per project on Pro, own variables and domain) is the alternative, but whether the Neon per-deployment branching carries over is not documented. Check the Turnstile preview widget accepts the stable branch hostname. Then do the two deferred Part D items: the CSP report-only run and a ZAP scan with the protection bypass header (the weekly `zap.yml` job already scans a production build).
- [ ] **A log drain** (Hendrik, Claude): Team Settings, Drains, Add Drain, production only, IP addresses hidden, to Better Stack (one vendor for logs and the uptime monitor; Pro required) or Axiom (one-click install). Vercel bills drains by volume (about $0.50 per GB on Pro; check the vendor's free tier). **First** update `docs/privacy.md` and `src/content/privacy.ts` (logs carry visitor IP addresses and user agents, so the vendor is a new processor), check its data processing agreement, and keep the retention wording true.
- [ ] **Uptime monitor** (Hendrik): Better Stack or UptimeRobot on `https://wordonthewater.net/api/health` ([runbooks/alerts.md](runbooks/alerts.md)); check each alert in the runbook has been seen to fire once.
- [ ] **Rehearsals** (Hendrik), if not done before launch: Instant Rollback, and a backup restore from the nightly dump and from Neon point-in-time recovery ([runbooks/restore-db.md](runbooks/restore-db.md)); the restore is repeated quarterly.
- [ ] **Move the crons to Vercel Schedules** (Claude): Vercel calls Cron Jobs a legacy feature (no removal date). A configuration change in `apps/api/vercel.json` (the three routes stay; remove the `crons` entries in the same change or each route runs twice), see [runbooks/deploy.md](runbooks/deploy.md), "Cron".
- [ ] **Web coverage reported in CI** (Claude): Vitest coverage as a CI step, a Phase 0 carry-over (PLAN.md 0.8).
- [ ] **Strict `Content-Type` check** on POST routes (Claude, PLAN.md 0.3).
- [ ] **Make `Lighthouse (mobile)` a required check** in branch protection, and the manual passes (keyboard only, VoiceOver, TalkBack) and a real mid-range Android check (Hendrik, PLAN.md 1.8), if not done before launch.

## 4. Kit and email

- [ ] **Returning unsubscribers: the manual procedure** (Hendrik). Kit cannot re-subscribe an unsubscribed person through the API (tested 2026-11-21, [ADR 0008](adr/0008-kit-subscriptions.md)), so someone who signs up again sees "check your inbox" and gets nothing; the success message now tells them to email `hello@`. When that mail arrives: (1) check in Kit that the address is `cancelled`; (2) reply and send them to a Kit form or landing page to sign up again, where double opt-in sends the confirmation (open question for Hendrik: Kit, the form "Word On The Water sign-up", Share: does it have a hosted page link you can send? not verified); (3) if not, send Kit support the email as evidence of their interest and they process the resubscription by hand. Never delete and re-add the person: Kit calls that a consent violation. Revisit with a real fix only if the volume justifies it.
- [ ] **Kit webhook, only with a paid Kit plan** (Hendrik decides): the free plan has none (401 on `/v4/webhook_endpoints`, confirmed 2026-11-21, [ADR 0008](adr/0008-kit-subscriptions.md)). If Kit is upgraded: `make kit-webhook URL=https://wordonthewater.net/api/webhooks/kit`, add `KIT_WEBHOOK_SECRET` to `wotw-api` Production only (Sensitive), redeploy, promote, check an unsigned POST gives 401, and confirm a real delivery shows 200. The daily sync can stay as a safety net.
- [ ] **"Built with Kit" badge** (Hendrik): the free plan adds it below every email and it cannot be restyled; a paid plan removes it (production_checklist.md, Part K).
- [ ] **Consider another email provider** (Hendrik, ADR first): Brevo may offer webhooks and transactional mail on a free plan, which could replace both Kit's webhook gap and Postmark. Not verified: check its free-plan limits and webhook terms. Switching means rewriting the client, the broadcast command, the signature check and the DNS (DKIM, return path), so only as a planned project.
- [ ] **Postmark setup** (Claude, Hendrik), with the prayer and contact forms (section 5): add `wordonthewater.net` in Postmark, DKIM and Return-Path records, merge Postmark into the one SPF record ([PLAN.md](PLAN.md) 1.4).
- [ ] **The weekly email, from the second week**: follow the four steps in [devotional_format.md](devotional_format.md) and [kit_email_devotional.md](kit_email_devotional.md); later the Phase 2 admin takes over (section 8).

## 5. Prayer request and contact forms (decided 2026-11-14: not part of the launch)

Detailed steps are in [PLAN.md](PLAN.md) 1.4 (prayer) and 1.5 (contact); the list below is the order to do them in.

- [ ] **Decide** (Hendrik): the prayer notification default, the full text emailed only if the requester ticks consent, otherwise "a new request is waiting".
- [ ] **Neon data processing agreement**: decide on the optional e-signature before prayer requests are stored ([privacy.md](privacy.md)).
- [ ] **Backend** (Claude, test first): `crypto.py` (AES-256-GCM envelope encryption, `key_id` per row, rotation), `POST /v1/prayer-requests` and `POST /v1/contact`, rate limits, Turnstile, honeypot, idempotency, `delete_after` (90 days, 12 months), no text in logs or Sentry (tested), the encryption key in the secret manager.
- [ ] **Web forms and page** (Claude): the sections, the "Prayer" menu and footer links back, `prayer@` named again on the page, the privacy policy sections in `src/content/privacy.ts`.
- [ ] **Postmark and variables** (section 4, Hendrik): `EMAIL_FROM`, `PRAYER_INBOX`, `CONTACT_INBOX`, `POSTMARK_SERVER_TOKEN` (Sensitive), `EMAIL_PROVIDER=postmark` on `wotw-api` Production.
- [ ] **Firewall rules** for the new Server Actions (Hendrik): their action names, as for sign-up and chat ([runbooks/deploy.md](runbooks/deploy.md)).
- [ ] **Smoke test on the real domain** (Hendrik): a prayer request reaches the prayer inbox, a contact message reaches `hello@`; forwarding may need the inbox pointed straight at the destination mailbox if it proves unreliable.
- [ ] **Threat model and privacy** updated (Claude).

## 6. Site content

- [ ] **Footer link to a full statement of faith** once a page or URL exists (optional, PLAN.md 1.6).
- [ ] **A point on the Holy Spirit or Jesus' return** in the statement of faith (optional, Hendrik writes the wording, PLAN.md 1.11).
- [ ] **A dedicated home page share image** (optional, Hendrik chooses, Claude swaps the file). Today the home link's WhatsApp and social card is the Advent lighthouse photo, cropped to 1200x630 with the site title on top (`apps/web/content/site/social/og-background.jpg`, built by `src/app/opengraph-image.tsx`). It is a separate copy of the photo, so changing the series art does not change it, and the live home page itself has no hero photo. After Advent the card will keep the lighthouse. Options: keep it as the permanent brand image (the plan for launch), or choose a dedicated picture (for example the surfing photo) and replace the file, then deploy, promote and re-test in WhatsApp with a changed address (previews are cached; Meta's Sharing Debugger can refresh the bare address). Do not make the home card follow the current series or devotional: a shared link would change under people.
- [ ] **A devotional archive page** (Phase 2.3): the series list is the index until then.
- [ ] **Weekly devotionals**: keep the weekly rhythm after the first on launch day (5, 12 and 19 December are written; more are needed after that).

## 7. Bible reader (behind `BIBLE_ENABLED`, on in Production since 2026-11-16)

Plan and compliance checks: [bible_feature.md](bible_feature.md).

- [ ] **ESV from Crossway's API** (blocked on their approval of the application made 2026-11-07, PLAN.md 1.2c B7): then show Crossway's notice and the `www.esv.org` link inside the reader itself, because the reader has no footer, and add the test that no ESV text is stored.
- [ ] **B8 compliance gate and the rest of B9** (Claude).
- [ ] **Later features, any order**: verse tap-to-select and a share-this-verse link, word search (local index for BSB and WEB), a type-it search box on the pickers, swipe between chapters, parallel view (check ESV limits with Crossway first), more public-domain versions (KJV, ASV, Darby) through the same importer, audio (ask Crossway first), red-letter words of Jesus, offline reading (the ESV part needs a Crossway licence).

## 8. Installable app, push messages and the next phases

- [ ] **Web Push for the weekly devotional** (planned after the PWA, decided 2026-11-16): design and steps W1 to W-last in [web_push.md](web_push.md) and [ADR 0011](adr/0011-web-push.md) (proposed; accepted when the W1 spike confirms the library). One notification a week, anonymous subscriptions, manual send for the first month. It shares one service worker with the offline decision.
- [ ] **Offline reading** (Phase 3, or with Web Push): a service worker serving recent devotionals and the last Bible chapters; a minimal offline fallback page.
- [ ] **Smaller PWA items** ([PWA_checklist.md](PWA_checklist.md), section 10): iOS launch screens, a wide desktop screenshot, an "Install" button on Android. Repeat the desktop install and iPhone checks on the live domain.
- [ ] **Phase 2, devotionals and admin**: admin login (passkey or magic link plus a second factor), roles, the prayer request admin view with an audit log, devotional authoring in a built-in admin, weekly email as Kit broadcasts from published devotionals, an RSS feed, search (PLAN.md Phase 2).
- [ ] **Decision gate at Phase 2: a native Flutter app** ([FLUTTER.md](FLUTTER.md), option B: keep the Next.js site and add a Flutter app for iOS and Android on the same API) (Hendrik).
- [ ] **Phase 3 and 4** (teaching series and audio, community) when wanted (PLAN.md).

## 9. Privacy and legal housekeeping

- [ ] **Print the Kit and Vercel data processing agreements to PDF** and keep them with the others ([privacy.md](privacy.md): kit.com/dpa and vercel.com/legal/dpa) (Hendrik).
- [ ] **Re-check Vercel's DPA now that the team is on Pro** (Hendrik): its text is written for Enterprise plans.
- [ ] **Review the privacy policy whenever data changes**: a log drain, the forms, a new email provider. Update `docs/privacy.md` and `src/content/privacy.ts` together and the date in `PRIVACY_UPDATED`.
