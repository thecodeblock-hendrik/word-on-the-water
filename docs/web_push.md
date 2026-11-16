# Web Push plan

**Status (2026-11-16): proposal, not decided, nothing built.** It depends on the PWA ([PWA_checklist.md](PWA_checklist.md)): push needs the service worker and, on iPhone, an installed home screen app. [CLAUDE.md](../CLAUDE.md) and [PLAN.md](PLAN.md) 2.5 treat Web Push as a Phase 2 gate decision; this document is the plan for taking that decision, and changing the phase needs your confirmation (see "Open questions"). Anything that changes the security posture needs an ADR first (CLAUDE.md section 14): ADR 0011 is step W0 below.

**Goal:** tell people who opt in that this week's devotional is out, with one short notification, from our own code, at no cost. It adds a channel next to the weekly Kit email; it does not replace it.

**Scope (v1):** one notification a week for a newly published devotional. **Not in scope:** marketing or "re-engagement" messages, per-person targeting, accounts, rich media, notification actions, a native app ([FLUTTER.md](FLUTTER.md)).

---

## 1. How it works, in one paragraph

The browser creates a **push subscription** (an endpoint URL on the browser vendor's push service plus two encryption keys) after the visitor says yes. Our server stores it. To notify, our server encrypts a small JSON message (RFC 8291), signs a request with our **VAPID** key (RFC 8292) and POSTs it to the endpoint (RFC 8030). The push service wakes the browser, which runs our **service worker**; the worker shows the notification, and a tap opens the devotional. The push services (Google, Mozilla, Apple, Microsoft) are free; we never need an account with them or a third-party sending platform.

**Platform support (checked 2026-11-16):**

| Platform | Works | Note |
|---|---|---|
| Chrome, Edge, Firefox on desktop and Android | Yes | Needs a service worker |
| Safari on macOS | Yes | |
| iPhone and iPad | **Only from an installed home screen web app** (iOS 16.4 or later) | Permission must be asked from a tap. Safari 26 opens every home screen site as a web app by default. Handling a push normally needs a service worker; Declarative Web Push (below) is the exception |
| Declarative Web Push | iOS 18.4 or later home screen apps | Push without service worker code; WebKit only as far as I could verify, so do not depend on it |

Always subscribe with `userVisibleOnly: true` and show a notification for every push: Safari requires it (WebKit), and Chrome does as well.

So on iPhone the order is: PWA installed, then the notification button appears.

---

## 2. Decisions and why

| Topic | Decision | Why, and what was rejected |
|---|---|---|
| Channel | Standard Web Push with our own **VAPID** keys | Free, no vendor account, works on all major browsers. Rejected: Firebase Cloud Messaging SDK (proprietary tokens, Google account), OneSignal, Novu and similar (third parties holding subscriber data, paid beyond a free tier, and you asked for no paid services) |
| Where the sending code lives | **FastAPI** (`apps/api`), with Next as the BFF for subscribe and unsubscribe | The database, Redis, cron and the outbox pattern are already there ([CLAUDE.md](../CLAUDE.md) sections 3 and 8). Next's own guide sends from Node with an in-memory store and says to use a database in production; we deviate on purpose |
| Library | **`pywebpush`** (2.5.0, released 2026-08-30, Python 3.10 or later, has `webpush_async()`), on top of `py-vapid` and `http-ece` | Established and keeps encryption and VAPID out of our own code. One maintainer, and it pulls in `aiohttp` and `requests` (we use `httpx`): step W1 proves it installs and runs inside the Vercel Python function size and runtime. Fallback: the smaller `webpush` package (1.0.6, built on `cryptography` and `PyJWT`) or a small implementation on `cryptography` |
| Storage | Postgres tables (section 4), anonymous: **no link to the Kit subscriber or an email address** | Data minimisation under GDPR and POPIA, and no account system exists |
| Trigger | A **cron route on the web project** finds a devotional whose `publishAt` is today and posts it to the API | The devotionals are markdown files in `apps/web/content`; the API project cannot see them. The API then fans out. Idempotent on the devotional slug, so a double run sends nothing twice |
| Fan-out | Resumable batches from a cron, plus an immediate best-effort start after the trigger | The same pattern as the Kit job (`kit_jobs.py`): a failure never loses the send, and the daily cron (Hobby) or 5-minute cron (Pro) finishes it |
| Send time | **One fixed UTC time** for everyone (proposal: 04:00 UTC, which is 06:00 in South Africa) | Per-person local time needs a stored timezone, which is extra personal data. See open question 2 |
| Opt-in UX | The visitor taps a button; no prompt on page load. Shown after value: on `/thank-you`, at the end of a devotional, and as a menu row | A prompt on first load is widely discouraged (people refuse what they were not asked for), and iOS requires a tap anyway |
| Kill switch | `WEB_PUSH_ENABLED` on both projects; unset hides the button and the API answers 503 | Same shape as `CHAT_ENABLED` |

---

## 3. Architecture

```
Browser (installed PWA or tab)
   | subscribe / unsubscribe (Server Action, BFF)
   v
Next.js (apps/web)  -- /sw.js (service worker), NotifyButton, cron route /api/cron/push
   | service token + forwarded client IP
   v
FastAPI (apps/api) -- /v1/push/subscriptions, /v1/push/broadcasts, /cron/push-drain
   |            \
   v             v
Neon          Upstash (rate limits)
   |
   +--> pywebpush --> push service (Google / Mozilla / Apple / Microsoft) --> device --> sw.js --> notification
```

The browser never calls FastAPI directly (ADR 0001). The cron route on the web project is protected by `CRON_SECRET`, like the API crons.

---

## 4. Data model (Alembic migration, backward compatible)

**`push_subscriptions`**

| Column | Notes |
|---|---|
| `id` | UUID v7, as everywhere |
| `endpoint_hash` | SHA-256 of the endpoint, **unique**: the lookup key, so unsubscribe and idempotent subscribe never expose or log the endpoint |
| `endpoint` | The URL we POST to, at most 2048 characters |
| `p256dh`, `auth` | The subscription keys. Without our VAPID private key they cannot send, but they are the message encryption secrets; encrypt them at rest with the application-layer scheme of [ADR 0006](adr/0006-prayer-encryption.md) (`key_id` per row). See open question 5 |
| `platform` | `desktop`, `android`, `ios` or `other`, from the browser's own client hints at subscribe time; nothing finer |
| `consent_text_version`, `consent_at`, `source` | Evidence of consent, as in `subscribers` |
| `status`, `failure_count`, `last_success_at` | `active`, `expired`, `disabled`; used by the sender and the retention job |
| `last_broadcast_id` | The newest broadcast this subscription has been handled for: makes the fan-out resumable and idempotent |

**`push_broadcasts`**: `id`, `devotional_slug` (unique), `title` (80), `body` (160), `url` (a path on this site), `status` (`pending`, `sending`, `done`), `created_at`, `completed_at`, and **counts only** (`sent`, `expired`, `failed`).

Retention (added to `/cron/retention`): delete a subscription at once on a 404 or 410; after 5 failures in a row; and after 90 days without a successful delivery. Sent broadcasts keep only their counts.

---

## 5. API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/v1/push/subscriptions` | service token | Validate, then insert or refresh by `endpoint_hash` (always the same 200 body); rate limited per hashed IP (Redis) |
| DELETE | `/v1/push/subscriptions` | service token | Remove by endpoint; always 204, so nobody can probe which endpoints exist |
| POST | `/v1/push/broadcasts` | service token | From the web cron: create the broadcast for a devotional (idempotent on the slug) and start the send |
| GET | `/cron/push-drain` | `CRON_SECRET` | Continue sending pending broadcasts in batches |

Pydantic schemas use `extra="forbid"` and strict limits (CLAUDE.md section 6.3). `/v1/push/subscriptions` checks: HTTPS only; the endpoint host is on the **push service allowlist** (section 7); `p256dh` decodes to a 65-byte uncompressed P-256 point and `auth` to 16 bytes; lengths within limits.

---

## 6. Sending

- **Payload** (JSON, encrypted by the library, well under the limit: a push service is only required to support 4096 octets, which leaves at most 3993 octets of message, per RFC 8291): `{ "title", "body", "url", "tag" }`. No personal data, ever. `url` is a path on our site and nothing else.
- **Headers:** `TTL: 86400` (a Saturday notice must not arrive on Monday; the push service rejects a missing TTL), `Urgency: normal`, `Topic`: at most 32 URL-safe characters derived from the slug, so a second message for the same devotional replaces the first.
- **VAPID:** `sub` is `mailto:hello@wordonthewater.net`; the token's `exp` is at most 24 hours (RFC 8292), which the library handles.
- **Concurrency and time:** about 20 requests in flight, 10 s timeout each, stop starting new sends at about 25 s of the 30 s `maxDuration`, leave the rest to the next cron run (found by `last_broadcast_id`). Roughly 1,000 subscriptions is a few seconds.
- **Outcomes per response:**

| Push service answers | We do |
|---|---|
| 201 | Count sent; reset `failure_count`; set `last_success_at` |
| 404 or 410 | The subscription is gone: delete it (410 Gone is RFC 8030's "expired") |
| 429 or 5xx | Respect `Retry-After`; retry in a later run, count a failure |
| 400, 401, 403 | A bug or a VAPID key mismatch, not the visitor: stop the run and report one scrubbed Sentry message |
| 413 | A payload bug: stop and report |

- **Counts only in logs and Sentry.** Never log an endpoint, a key or a payload.

---

## 7. Security and privacy

1. **SSRF is the main new risk.** The server POSTs to a URL a visitor supplied. Mitigations, all tested: HTTPS only; the host must match a maintained allowlist of push services (for example Google `fcm.googleapis.com` and Mozilla `updates.push.services.mozilla.com`, which the sources I found name, plus Apple and Microsoft hosts that **must be confirmed against each vendor's current documentation in W3**, kept in one reviewed file); no redirects followed; the resolved address must not be private or internal; and the check is repeated at send time, because the stored URL is the outbound target (OWASP SSRF cheat sheet). The allowlist is a starting point that someone must keep up to date; a new push service shows up as failed subscribes, which the e2e and the first week of logs would reveal.
2. **VAPID keys.** The private key is a Sensitive variable on the API project only (Production only; Preview gets its own pair). The public key is `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (public by design). **A subscription is bound to the public key it was made with, so rotating the key invalidates every subscription**: treat the pair as permanent unless it leaks, and write the re-subscribe path in the runbook.
3. **A push subscription is personal data** (an online identifier). Lawful basis is consent, recorded with a timestamp and the wording version. The privacy page and [privacy.md](privacy.md) need a new section: what is stored (the endpoint and keys), why, how long, how to withdraw, and that the **push services of the browser vendors are processors** that see the encrypted message and the endpoint. It is not linked to the email list.
4. **Abuse and flooding.** Rate limit the subscribe route per hashed IP; hard length limits; a cap on rows (alert, do not silently stop); no Turnstile (the subscribe call comes from the browser's own push API, not a form).
5. **Service worker.** Served from `public/sw.js` with `Cache-Control: no-cache, no-store, must-revalidate` and its own `Content-Security-Policy: default-src 'self'; script-src 'self'` (Next's guide, section "Securing your application"); `worker-src` falls back to `default-src 'self'` in our nonce CSP. On `notificationclick` it opens only a same-origin path taken from the payload; anything else opens `/`.
6. **Threat model** ([threat-model.md](threat-model.md)): add rows for the SSRF, the flood of fake subscriptions, the VAPID key, a leaked subscription list and the service worker, with the tests that prove each.

---

## 8. The client

- `apps/web/public/sw.js` handles `push` (always shows a notification, because `userVisibleOnly` is true), `notificationclick` (focus an open tab on the URL or open one) and `pushsubscriptionchange` (re-subscribe and tell the API). Plain JavaScript, no build step, outside the landing page JS budget.
- A `NotifyButton` client component, **loaded only on interaction or when near the screen** (dynamic import), like the chat. States: unsupported (hidden), iPhone not installed (a short "add to Home Screen first" note, no button), ready, subscribed (with a turn-off control), and blocked (browser permission denied: say how to re-enable, never re-prompt).
- Subscribe with `userVisibleOnly: true` and the public key, call it **directly from the tap handler** (Apple's rule for iOS), then send the subscription through a Server Action. Unsubscribe calls `subscription.unsubscribe()` and then the API.
- Copy: one plain sentence ("a short note on Saturday when the new devotional is out; turn it off any time") and no countdowns or nagging. Never ask twice in one visit.

---

## 9. Operations

- **Runbook** `docs/runbooks/web_push.md` (W8): the switch, key handling and rotation, the allowlist, reading the counts, what a failed send looks like.
- **Cost:** no per-message charge from anyone. The only usage is a few seconds of function time a week.
- **Cron:** a daily trigger at the send time works on Hobby; on Pro the 5-minute drain finishes interrupted sends.
- **Manual command** `pnpm push:devotional <folder> --dry-run|--send`, like `pnpm broadcast:devotional`: preview the notification and send on purpose. Whether the cron sends on its own is open question 3.

---

## 10. Testing

Tests first, real Postgres and Redis, mock only the third party (here, the push service). In CI the "push service" is a small local HTTP server; tests may add `localhost` to the allowlist, and **production refuses it**.

| Level | What it proves |
|---|---|
| Unit | Payload and header building (TTL, Topic length, size under the limit); key validation; the allowlist and IP checks, with attack cases (a private address, a redirect, a look-alike host, plain HTTP, an over-long endpoint) |
| Integration | Subscribe is idempotent and the 200 body never changes; unsubscribe always 204; rate limit and 503 with the flag off; a send marks sent, deletes on 410, retries on 429 and 5xx, stops on 401; a second run sends nothing twice; no endpoint or key appears in a captured log |
| E2E (Playwright, Chromium) | Service worker registers; the button's states; subscribe and unsubscribe against a stub API with `PushManager.subscribe` stubbed (a real subscription needs the vendor's service); a `push` event delivered to the worker (for example through the Chrome DevTools Protocol; to be proven in W6) shows a notification and the click opens the devotional; axe clean; JS budget unchanged on the landing page |
| By hand | Android Chrome; desktop Chrome, Firefox and Safari; iPhone installed (permission, delivery, tap) and not installed (the instructions); a real send from a preview |

---

## 11. Build steps

One branch per section, as in [PWA_checklist.md](PWA_checklist.md). Not started; tick as done.

- [ ] **W0 Decide.** Answer the open questions below; write ADR 0011 (channel, library, data held, processors, SSRF controls); update CLAUDE.md and PLAN.md 2.5 to match
- [ ] **W1 Spike.** Install `pywebpush` in `apps/api`, send one encrypted push to a real browser endpoint from a Vercel Python function; check the function size, cold start and that redirects can be refused (or pre-resolve the host ourselves). Decide library or fallback
- [ ] **W2 Data.** Migration and models (section 4); retention additions; tests
- [ ] **W3 Subscribe API.** Schemas, validation, SSRF allowlist, rate limit, idempotency, flag; OpenAPI types regenerated
- [ ] **W4 Send.** Broadcast creation, resumable fan-out, `/cron/push-drain`, error handling per section 6; a fake push service for the tests
- [ ] **W5 Service worker.** `sw.js`, headers and CSP, registration; works with the PWA's manifest and scope
- [ ] **W6 Client.** `NotifyButton`, states, iOS handling, the three placements, copy; e2e
- [ ] **W7 Trigger.** The web cron route (`vercel.json` crons on the web project), `pnpm push:devotional`, the dry run
- [ ] **W8 Docs.** [privacy.md](privacy.md) and the public privacy page, [threat-model.md](threat-model.md), the runbook, [production_checklist.md](production_checklist.md) items
- [ ] **W9 Prove it.** The by-hand matrix on a preview, then enable `WEB_PUSH_ENABLED` in Production **(Hendrik)**
- [ ] **Later:** per-person send time; "new series" notices (only if you decide to); Declarative Web Push once other browsers support it

---

## 12. Open questions for Hendrik

1. **Scope.** Only "the new devotional is out", or also occasional notices (a new series, audio)? I recommend only the devotional in v1: it keeps consent simple and the channel trusted.
2. **Send time.** One fixed UTC time (simple, no extra data) or each person's local morning (needs a stored timezone)? I recommend fixed. The email says "Saturday at dawn"; 04:00 UTC is 06:00 in South Africa.
3. **Automatic or on purpose.** Send by cron when the devotional publishes, or only when you run `pnpm push:devotional --send` (like the weekly email draft, so nothing goes out by accident)? I recommend manual for the first month, then automatic.
4. **Where to ask.** `/thank-you`, the end of each devotional and a menu row. Anything to add or drop? Not on the landing page hero.
5. **Encrypt the subscription keys at rest** with the ADR 0006 scheme? It costs a little complexity and protects the keys if the database leaks; I recommend yes.
6. **When.** Before launch (28 November) is not realistic, since the PWA is not built. Confirm it moves from "Phase 2 gate decision" to "planned after the PWA", and whether it shares the service worker with the offline decision in [PWA_checklist.md](PWA_checklist.md) step 1.

---

## Sources

- [RFC 8030, Generic Event Delivery Using HTTP Push](https://www.rfc-editor.org/rfc/rfc8030.html): TTL, Urgency, Topic, 410 Gone
- [RFC 8291, Message Encryption for Web Push](https://www.rfc-editor.org/rfc/rfc8291.html): the 4096 and 3993 octet limits
- [RFC 8292, VAPID](https://www.rfc-editor.org/rfc/rfc8292.html): `aud`, `exp` (at most 24 hours), `sub`
- [Web Push for Web Apps on iOS and iPadOS, WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/); [Meet Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/); [WebKit features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- [pywebpush on PyPI](https://pypi.org/project/pywebpush/) and the [`webpush` package](https://pypi.org/project/webpush/)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- Next.js 16.4.6's bundled guide, `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` (push and "Securing your application")
