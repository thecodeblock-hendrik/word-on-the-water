# 0011. Web Push for the weekly devotional

Status: proposed 2026-11-16. The design was decided by Hendrik on 2026-11-16 (see [web_push.md](../web_push.md), section 12). This ADR becomes **accepted** when spike W1 confirms the library choice. Nothing is built.

## Context
The site is moving to an installable PWA ([PWA_checklist.md](../PWA_checklist.md)). Hendrik wants a notification when a new devotional is out, from our own code and with no paid service. [CLAUDE.md](../../CLAUDE.md) listed Web Push as a Phase 2 gate decision; it is now planned after the PWA.

A push notification needs data we do not hold today (a push subscription: an endpoint URL on the browser vendor's push service plus two encryption keys), a new set of recipients of data about our visitors (the browser vendors' push services), and a server that makes outbound requests to URLs that visitors supply. That changes the data model and the security posture, so it needs an ADR (CLAUDE.md section 14).

## Decision
- **Standard Web Push** (RFC 8030, 8291, 8292) with **our own VAPID keys**. No push platform, no Firebase SDK, no vendor account.
- **Sent from FastAPI**, with Next as the BFF for subscribe and unsubscribe (ADR 0001). The Python library is `pywebpush` (2.5.0), subject to spike W1 proving that it installs and runs inside the Vercel Python function; the fallback is the smaller `webpush` package or a small implementation on `cryptography`.
- **Two Postgres tables** (`push_subscriptions`, `push_broadcasts`). Subscriptions are **anonymous**: no link to the Kit subscriber or an email address. The subscription keys (`p256dh`, `auth`) are encrypted at rest with the scheme of ADR 0006. A broadcast keeps counts, never recipients.
- **Scope:** one notification for a newly published devotional, nothing else. One fixed send time for everyone (about 05:00 South African time automatic, about 08:00 when sent by hand), manual for the first month, then automatic behind `PUSH_AUTO_SEND`.
- **One service worker** (`public/sw.js`), shared with the PWA's offline decision, served with `Cache-Control: no-cache` and its own CSP.
- **Consent:** a button the visitor taps, shown after value (`/thank-you`, the end of a devotional, a menu row); never a prompt on page load. On iPhone the button appears only in an installed home screen app, because that is the only place iOS allows push.
- **Controls against the new risks:** the endpoint must be HTTPS and on a reviewed allowlist of push service hosts, with no redirects and no private addresses, checked again at send time (SSRF); the VAPID private key is a Sensitive variable on the API project only; no personal data in a payload; no endpoint, key or payload in logs or Sentry.
- **Retention:** delete a subscription on a 404 or 410, after 5 failures in a row, and after 90 days without a successful delivery.
- **Kill switches:** `WEB_PUSH_ENABLED` (feature) and `PUSH_AUTO_SEND` (automatic send).

## Alternatives rejected
- **Firebase Cloud Messaging, OneSignal, Novu and similar:** a third party would hold subscriber data, and paid tiers appear as volume grows; you asked for no paid services.
- **Sending from Next with Node's `web-push`**, as Next's own guide shows: the database, Redis, cron and outbox pattern all live in the API, and the guide's in-memory store is for demos only.
- **Linking subscriptions to the Kit list or to accounts:** extra personal data for no benefit; there are no accounts.
- **Per-person local send time:** needs a stored timezone, which is more personal data.
- **Declarative Web Push:** WebKit only as far as verified; not relied on.

## Consequences
- **New processors to disclose.** The push services of Google, Mozilla, Apple and Microsoft see the endpoint and the encrypted message. The privacy page and [privacy.md](../privacy.md) get a section, and consent is recorded with a timestamp and the wording version.
- **A new outbound-request surface (SSRF).** The allowlist is a list someone must keep current; a new push service appears as failed subscribes. The threat model ([threat-model.md](../threat-model.md)) gets rows for the SSRF, a flood of fake subscriptions, the VAPID key, a leaked subscription list and the service worker, each with the test that proves it.
- **Rotating the VAPID key invalidates every subscription,** because a subscription is bound to the public key it was made with. The pair is treated as permanent unless it leaks, and the runbook says how people re-subscribe.
- **Sending has a time limit.** A Vercel function runs at most 30 s here, so the send is resumable in batches (`last_broadcast_id`) and a cron finishes an interrupted run. On Hobby a daily cron may fire anywhere in its hour; Pro runs it at the exact minute.
- **New dependencies** in `apps/api` (`pywebpush`, which brings `aiohttp` and `requests`, `py-vapid`, `http-ece`), checked for size and cold start in W1.
- **Revisit** if the subscriber count outgrows a single function run (then Vercel Queues or QStash, as CLAUDE.md already notes), if the library is abandoned, or if per-person send time becomes worth the extra data.
