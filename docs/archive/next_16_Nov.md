# Next steps: Monday 16 November 2026

Written 2026-11-15 evening. Launch is **Saturday 28 November 2026**, 12 days away. Advice on order only: the step lists and ticks stay in [PLAN.md](../PLAN.md) and [production_checklist.md](../production_checklist.md). The longer view is in [next_steps.md](next_steps.md).

## Where things stand

- **Merged today:** PR #114 (Lighthouse CI on a mobile profile, axe on the landing, devotional and not-found pages, ADR 0010 setting the landing JS budget at 165 KB, the `basic-ftp` override, the Kit setup docs).
- **Open:** PR #115, 25 Bible character entries for the chat (228 entries, 15 themes). It waits for your read of the wording and for its checks.
- **Email authentication (Part E) is done for Kit** ([kit_setup.md](kit_setup.md)): a test reached the Gmail inbox with SPF, DKIM and DMARC all passing. A real sign-up on the live domain is still to be proven.
- **Lighthouse on the preview:** landing 100 / 100 / 100, LCP 0.98 s. The devotional page is the one problem: simulated LCP 2.4 to 3.1 s (observed 0.8 to 1.3 s). Cause not found; `fetchpriority` alone did not help.

## Tomorrow, in order

1. **PR #115 (about 20 minutes, you).** Read the entries in `apps/api/kb/faith_kb.md` under `## 16. Bible Characters`, especially Mary (16.21), Adam and Eve (16.2), Deborah (16.9) and Peter (16.23). Tell me any wording changes; merge once the checks are green and you are happy.
2. **Devotional LCP (1.8).** Use a Lighthouse trace to see what the devotional page loads that the landing page does not (two art images, the series nav, the verse card), then fix and re-measure on a preview. Tried and ruled out: `fetchpriority="high"` alone. Eager loading gave about 2.4 s under real throttling but left the simulated 3.1 s. When it passes, change the devotional assertions in `apps/web/lighthouserc.json` from warnings to errors.
3. **Make the `lighthouse` job a required check on `main`** (GitHub branch protection; yours to switch on, or tell me and I will give the steps).
4. **Start the PWA conversion (Part C, [PWA_checklist.md](../PWA_checklist.md)) on a branch.** It is the largest unbuilt launch item and the Phase 1 exit criteria count it. Manifest, icons and theme colours first.
5. **Chat go-live walk-through (Part L).** With `CHAT_ENABLED=1` now in your local `.env`, try the chat locally first (starter questions, a contested one, an off-topic one, a phone number, a crisis phrase, Clear chat, the new Bible Characters theme in Browse by topic). Then set the flag on both Vercel projects (Preview scope) and repeat on a preview.

## Yours to do (short, no coding)

- **Vercel Pro (Part B):** needed before the public launch; Hobby is non-commercial and limits crons. Turn on two-factor, the audit log and the registrar lock.
- **Content decisions:** the two social handles in the footer (or hide them), a pastor or elder reading "Start here", one full read of the privacy page.
- **Kit housekeeping:** delete the test draft broadcast ("TEST - domain authentication check") and the SPIKE drafts. Do it before the first `--all` broadcast.

## Later this week

- ZAP baseline scan against a preview (1.8), then the manual passes: keyboard only, VoiceOver, TalkBack and a mid-range Android phone.
- Vercel Firewall rate-limit rule for `/v1/chat/messages`.
- Parts F, D, G, H, I of the launch checklist, then the first broadcast (`pnpm broadcast:devotional advent-01-more-than-watchmen --all` a few days before, scheduled for 28 November after 02:00 Harare time).
- Re-check the crisis numbers (SADAG, LifeLine) on the providers' sites the day before launch.

## Housekeeping

- Update local `main` (it is behind `origin/main`) and delete the merged local branches (`docs/next-steps`, `feat/1.8-lighthouse-ci`).
- The PLAN.md status heading still says "updated 2026-11-14".
- Run unit tests with `env -u DEVOTIONAL_TODAY -u BIBLE_ENABLED`: your shell exports both and 17 tests fail while they are set.
- Local dev with everything on: `make up`, then `CHAT_ENABLED=1 uv run uvicorn app.main:app` in `apps/api` and `DEVOTIONAL_TODAY=<date> BIBLE_ENABLED=1 pnpm dev` in `apps/web`.

## Risks to watch

- **Email is still the single point of failure.** Prove a real sign-up confirmation on the live domain before 28 November (Part I).
- **Time.** The PWA, the domain cutover and the Kit redirect and webhook all come after the preview checks, and each needs the domain or Pro. Start the Pro upgrade tomorrow so nothing waits on it.
