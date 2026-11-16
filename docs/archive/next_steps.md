# Next steps

Written 2026-11-15, after the Got Questions chat enhancements (PR #113). Launch is **Saturday 28 November 2026**, 13 days away. This file is advice on order, not a second plan: the step lists stay in [PLAN.md](../PLAN.md) and [production_checklist.md](../production_checklist.md), and ticks go there.

## Where things stand

- **Built and tested:** landing page with real copy, devotionals (five Advent weeks, the first on launch day), Bible reader (BSB and WEB, behind `BIBLE_ENABLED`), email sign-up with Kit double opt-in and the webhook route, privacy page, `security.txt`, SEO basics, retention job, weekly email draft command, and the Got Questions chat (off until `CHAT_ENABLED=1`).
- **Not on the page at launch:** the prayer and contact forms. The page has no prayer option; `hello@` is the contact address.
- **The site is not public yet.** Everything that needs the live domain is in the launch checklist.

## The shape of the next two weeks

Email authentication (Part E) was the long pole and is **done for Kit** (2026-11-15, [kit_setup.md](kit_setup.md)). The domain publishes DMARC `p=reject`; Kit now signs with DKIM as `wordonthewater.net`, and a test reached the Gmail inbox with SPF, DKIM and DMARC all passing. The confirmation email of a real sign-up is still to be proven on the live form.

### 1. This week: start what has waiting time

1. **Merge PR #113** (checks green) so the work is on `main`.
2. **Email authentication, Part E: done for Kit on 2026-11-15** ([kit_setup.md](kit_setup.md): sending domain verified, three CNAMEs in Squarespace, a test reached the Gmail inbox with SPF, DKIM and DMARC all PASS). Left: a real sign-up on the live form once the domain is attached (Part I), and deleting the test and SPIKE drafts in Kit.
3. **Vercel Pro, Part B (Hendrik).** Hobby is non-commercial and limits crons; Pro is needed before the public launch. Turn on two-factor, audit log, the registrar lock, and store the recovery codes offline.
4. **Content decisions only Hendrik can make:** the two social handles in the footer (or hide them), a pastor or elder reading "Start here", and one full read of the privacy page (Part A).

### 2. Quality gates (PLAN 1.8): the biggest open engineering item

None of 1.8 is ticked, and one finding needs a decision now.

- **Landing JavaScript budget: decided 2026-11-15, [ADR 0010](../adr/0010-landing-js-budget.md).** About 161 KB gzipped is mostly React and Next (about 120 KB), so the byte budget is now 165 KB, enforced by the e2e ceiling. LCP, CLS, INP and the Lighthouse scores stay as set and are the real test.
- Add **Lighthouse CI on a mobile profile** and measure on a deployed preview, because pages render per request (ADR 0007). Targets: LCP under 2.0 s, CLS under 0.05, INP under 200 ms, scores 95 / 100 / 100 / 100.
- Run **axe on every page** (it covers the landing page, the chat and the Bible reader today; devotional, privacy and thank-you pages are the gap).
- **ZAP baseline scan** against a preview or staging, no high findings.
- API service coverage 85% is already gated in CI; just tick it once confirmed.

### 3. Chat go-live (Part L), in this order

1. On the PR preview or the next preview, set `CHAT_ENABLED=1` on **both** Vercel projects (Preview scope) and walk through Part L: starter questions, a contested one, an off-topic one, a phone number (rejected), a crisis phrase (fixed reply with the SADAG and LifeLine numbers), Clear chat, reload and tab close.
2. Add the **Vercel Firewall rate-limit rule** for `/v1/chat/messages` and see a generic 429 trip.
3. Re-check the crisis numbers on the providers' own sites the day before launch.
4. **(Hendrik)** Set `CHAT_ENABLED=1` in Production on both projects and redeploy. Rollback is unsetting it and redeploying.
5. If any of this slips, the chat can launch a week later with no code change; the button stays a mail link meanwhile.

### 4. The go-live sequence (Parts F to I), once E and B are done

1. **Part F:** production configuration (still no domain switch).
2. **Part C:** PWA conversion, on a branch, tested on a preview (installable, icons, manifest, theme colours). Skip or defer it only by an explicit decision; the exit criteria in CLAUDE.md count it as part of Phase 1.
3. **Part D:** security and operations checks on staging or preview, including a backup restore test.
4. **Part G:** attach `wordonthewater.net` (this switches the website).
5. **Part H:** Kit form redirect and webhook registration (`make kit-webhook URL=...`).
6. **Part I:** production smoke test on the real domain, including a real sign-up and confirmation.
7. **Part K, first broadcast:** run `pnpm broadcast:devotional advent-01-more-than-watchmen --all` a few days before, check the draft, send yourself a test, and schedule it in Kit for 28 November after 02:00 Harare time (the page goes live at 00:00 UTC). Clean up the spike leftovers in Kit first so the first send goes only to real people.

### 5. Weekly rhythm after launch

Each Saturday's devotional is already in the repo (weeks 2 to 5 on 5, 12, 19 and 26 December). Create the Kit draft a few days earlier for each, review, and schedule. Plan the series after Advent before 26 December so there is no gap.

## After launch (in rough order)

1. **Review the chat's outcome counts weekly for a month** (share of `no_answer` and `clarify`), and add or reword knowledge base entries by pull request (`make kb`, `make kb-check`).
2. **Prayer request form (1.4)** with encryption, the prayer inbox and its retention, then **contact form (1.5)**. When 1.4 is built, put back the Prayer link in the menu bar (`nav-links.ts`) and footer (`landing.ts`), the `#contact` section, the manifest shortcut and the `prayer@` line in the privacy policy ([landing_page_check.md](landing_page_check.md) Part D lists the UI steps).
3. **Move the two crons to Vercel Schedules** (configuration only, see PLAN 1.7).
4. **Playwright pin:** retry the next release after 1.64.1 and remove the Dependabot ignore when it passes.
5. **ESV:** when Crossway approves, add it to the Bible reader, with its notice and the www.esv.org link inside the reader (the reader pages have no site footer).
6. **Phase 2 (devotionals and admin):** decide between the built-in admin and a headless CMS, revisit the native app and Web Push at its gate.

## Risks to watch

- **Email is still the single point of failure for launch.** Kit's DKIM is set and a broadcast test passed, but prove a real sign-up confirmation on the live domain before 28 November.
- **Hobby limits.** Daily crons only; the outbox drain is daily until Pro. The immediate send after each request covers normal use.
- **Preview databases are migrated by hand.** Any new migration must be applied to `preview-base` first (PLAN 1.3).
- **Public repo.** Never commit secrets, subscriber data or real prayer requests; gitleaks guards it.
