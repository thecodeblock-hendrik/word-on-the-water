# Continue here

Written 2026-11-07 at the end of the day, so the next session has a starting point. Read this first, then `CLAUDE.md` and `docs/PLAN.md`.

## Where we are

Step **1.3 (email sign-up with Kit)** is built and PR #78 is merged to `main` (2026-11-07). Production is not redeployed and `wordonthewater.net` still points at Squarespace, so test on the preview alias (the production Turnstile widget only allows the real domain).

**Open problem (2026-11-08):** on the preview, Subscribe shows "Sign-up is not available right now". The API log shows Turnstile passing and then `DBAPIError` (`asyncpg.py:840`) on `POST /v1/subscribers`. `preview-base` was behind one migration and was migrated to `471ab1c015c8`, but the error stayed, so check which Neon branch the preview API really uses (the per-git-branch branch) and its `alembic_version`. See the Migrations section of `docs/runbooks/deploy.md`.

- **PR:** https://github.com/thecodeblock-hendrik/word-on-the-water/pull/78 (branch `feat/1.3-kit-signup`). All 14 checks pass, including Playwright e2e. **Not merged yet**: one section branch per plan section, merge only when the section is done.
- **Preview deployments** (behind Vercel login, so only you can open them):
  - web: https://wotw-web-git-feat-13-kit-signup-thecodeblock.vercel.app
  - api: https://wotw-api-git-feat-13-kit-signup-thecodeblock.vercel.app
- You finished `docs/secret_key_instructions.md` sections A to D (Cloudflare Turnstile widgets, Kit test form decision, and the Vercel variables for `wotw-api` and `wotw-web`).

What PR #78 contains (details in the PR and in `docs/PLAN.md` step 1.3, ADR 0008 and the threat model):

- **Web:** the sign-up form in the closing band (`#subscribe`, landing page and every devotional) and the `/thank-you` page. Turnstile loads only when the form is near the screen or used.
- **API:** `POST /v1/subscribers` (always the same 202), honeypot and minimum time, Turnstile check, rate limits (5 an hour per address, 3 per email), idempotency keys, a `kit_subscribe` outbox job tried right after the response and retried by the cron.
- **Kit:** subscriber created as `inactive` then added to the double opt-in form, so Kit sends the confirmation. Webhook `POST /v1/webhooks/kit` mirrors `activated`, `unsubscribed`, `complained` and `bounced`.
- **Database:** migration adds `kit_subscriber_id` and drops the unused token columns.

## Do this first tomorrow: section E (check the preview)

I cannot open the preview (Vercel login wall), so this is yours to do in your browser.

1. [ ] Open the web preview address above (log in to Vercel if asked).
2. [ ] Scroll to the dark band at the bottom of the home page ("One devotional. Every Saturday at dawn.").
3. [ ] Enter an email address you can read that has **not** signed up before. Not `hendrik@thecodeblock.net`, `march@thecodeblock.net` or `hendrik+kit2@thecodeblock.net` (already used).
4. [ ] Wait about five seconds (the spam check needs a moment), then press **Subscribe**. Expect "Check your inbox".
5. [ ] Tell Claude Code the address you used. Claude checks Kit: the subscriber should exist as unconfirmed (`inactive`) and be on the form. That proves the background Kit call finishes after the response on Vercel (the open question in ADR 0008).
6. [ ] Open the confirmation email and click the link. Note where you land.
   - The redirect goes to whatever address is set on the Kit form. `/thank-you` only exists on the preview until PR #78 is merged and production is redeployed, so a "Page not found" on the production domain is expected, not a failure.
   - What matters is that Kit marks the subscriber `active`. Tell Claude Code, who will verify it in Kit.

### If the form says "Sign-up is not available right now"

Open Vercel, the project, **Logs**, for the preview deployment of `wotw-web` and of `wotw-api`. Likely causes:

- `SERVICE_TOKEN` differs between `wotw-web` and `wotw-api` for Preview (the API turns the call away with a 401).
- `TURNSTILE_SECRET_KEY` is missing in the `wotw-api` Preview environment (the API answers 503).
- `API_BYPASS_SECRET` is missing in `wotw-web`, so the website's server cannot get past the API project's login wall.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` was added after the preview was built: push any commit or redeploy so it is built in (the form then shows "Sign-up is not available yet").
- `KIT_API_KEY` or `KIT_FORM_ID` is wrong or missing in `wotw-api` Preview (the sign-up is accepted, but the job fails and stays pending; the cron retries it).

Tell Claude Code what you see and it will work out which.

## Then finish 1.3, then merge PR #78

Still open in step 1.3 (all need you or a deployed preview):

- [ ] Section E above passes (sign-up, confirmation email, Kit shows `inactive` then `active`).
- [ ] **Set the Kit form redirect** to the `/thank-you` address you want (test form on the preview or test site first; the production form on `https://wordonthewater.net/thank-you` at launch).
- [ ] **Decide how Kit reaches the protected API project** for the webhook: a Vercel protection-bypass value in the registered address, or a route on the web project that forwards the raw body. Claude Code leans towards the bypass address (simpler); the signature protects either way. Record it in ADR 0008.
- [ ] **Register the Kit webhook:** `make kit-webhook URL=https://<api address>/v1/webhooks/kit`. It saves the signing secret into the local `.env` as `KIT_WEBHOOK_SECRET` and never prints it. Copy it to `wotw-api` in Vercel (Sensitive).
- [ ] **Confirm with the first real delivery** that signatures verify (the HMAC key is the whole `whsec_...` string; this comes from Kit's example code, not a stated rule).
- [ ] Merge PR #78 once the above is ticked (`gh pr merge 78 --squash --admin` with every check green), then redeploy production yourself.

## After 1.3

Next in `docs/PLAN.md`:

- **1.4 Prayer request form:** AES-256-GCM encryption (`crypto.py`), `POST /v1/prayer-requests`, notification email to `prayer@wordonthewater.net`, 90 day retention, a web form with the same standards as the sign-up.
- **1.5 Contact form**, then 1.6 (legal, SEO, **the PWA**: see `docs/PWA_checklist.md`), 1.7 retention and operations, 1.8 quality gates, 1.9 launch.
- Other parked work: the Bible reader behind `BIBLE_ENABLED` (`docs/bible_feature.md`; the ESV waits for Crossway's approval) and the optional type-it shortcut for the pickers.

## Local state (this machine)

- Branch `feat/1.3-kit-signup`, everything committed and pushed. Untracked and left alone on purpose: `docs/design/A. Night swell@2x.png`, `docs/design/B. Dawn patrol@2x.png`, and the deleted `mockup_site.pdf` (not part of this work).
- Running in the background (may be stopped by tomorrow): web dev server on http://localhost:3000, API on http://localhost:8000 (started before the webhook was added, so restart it to pick that up), Docker with Postgres, Redis and Mailpit (`make up`).
- Root `.env` (git-ignored, no values here) holds: the Kit API key and form id, Cloudflare's always-pass Turnstile **test** keys, and these local flags: `DEVOTIONAL_TODAY=2026-12-20` (pretends it is that day), `BIBLE_ENABLED=1`, `DEV_ORIGINS=<your Wi-Fi address>` (lets a phone open `pnpm dev`). `KIT_WEBHOOK_SECRET` is not set yet.
- Run `make up` and `make migrate` if the database is empty or behind. Two backup tests fail locally only because `pg_dump` is not installed; CI runs them.
- Your Kit account holds test subscribers: `hendrik@`, `march@` (confirmed, active) and `hendrik+kit2@` (never delivered, unconfirmed), all at `thecodeblock.net`. Kit's API cannot delete subscribers; delete them in Kit's interface if you want a clean list. The unused second Kit form (`Newsletter site`, id 10158113) can be deleted in Kit's interface.

## How we work (reminders)

- One branch per plan section, one commit per step, tests first, stage named files (never `git add -A`), Conventional Commits (`feat`, `fix`, `docs`, `test`, not `content`).
- Branch names of 36 characters or fewer. Merge with `gh pr merge --squash --admin` only when every check is green.
- Never put secrets in chat, files or the repo. gitleaks blocks commits that look like keys, so keep fake test values low-entropy.
- Vercel changes, production redeploys and browser-only checks are yours; Claude Code gives the steps.
