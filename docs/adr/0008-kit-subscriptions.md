# 0008. Kit for subscriptions and newsletters

Status: accepted (sign-up flow proven by a spike on 2026-11-07 and end to end on a Vercel preview on 2026-11-08; the webhook is built and tested but not yet registered or seen with a real delivery; broadcast mechanics proven by a spike on 2026-11-14; delivery from `hello@wordonthewater.net` waits for Kit's DKIM, see the broadcast section)

## Context
Kit (kit.com, API v4) owns the subscriber list, the double opt-in confirmation email, unsubscribe links and the legal footer. Our API validates, defends and forwards sign-ups. We needed to know which Kit calls make Kit send the confirmation email and what state a subscriber has until they confirm.

## Decision
Sign-up is two calls from the outbox job (`kit_subscribe`), with the id from the first call used in the second:

1. `POST /v4/subscribers` with `email_address`, `first_name` and **`state: "inactive"`**. This is an upsert and returns the subscriber id.
2. `POST /v4/forms/{form_id}/subscribers/{id}` with a `referrer` (the page URL, used as consent evidence). Kit then emails the confirmation message of the double opt-in form.

Config: `KIT_API_KEY` and `KIT_FORM_ID` (Sensitive on the API project; the test form and a test key everywhere except Production).

## What the spike proved (test form, real calls, 2026-11-07)
- A subscriber created without a state is `active` immediately, before any confirmation (the docs default `state` to `active`). Using that route would skip double opt-in, so it is not used.
- Created as `inactive` and then added to the form: the confirmation email arrived within seconds, the subscriber stayed `inactive` until the link was clicked, and became `active` after the click, which opened our thank-you page (the redirect set on the Kit form).
- Adding by email (`POST /forms/{id}/subscribers`) and by id both work; both require the subscriber to exist already (an unknown email gives 404). Adding the same subscriber twice returns 200 instead of 201, so a retry from the outbox is safe.
- There is no way to delete a subscriber through the v4 API (`DELETE /subscribers/{id}` is 404). `POST /subscribers/{id}/unsubscribe` moves a subscriber to `cancelled`; Kit says this is effectively permanent and a re-subscribe needs the person's explicit permission.
- `GET /subscribers?email_address=` can return nothing for a few seconds after a subscriber is created. Never look a subscriber up by email right after creating it; use the id from the create response.
- An email address with a plus tag (`name+tag@domain`) did not deliver for the test mailbox, so tests that need delivery use plain addresses.
- Kit accepts our sender: `hello@wordonthewater.net` is a verified sending address in the account. DMARC is not configured yet (`is_dmarc_configured: false`); it is part of launch step 1.9.

## Open points (check before relying on them)
- The redirect after confirming is one URL set on the Kit form. Whether a different URL can be used for the first and second visit is not known; the thank-you page must read correctly for a visitor who arrives after confirming. Because our own form calls the API, there is no Kit redirect after the sign-up itself: our page shows "check your inbox" (or redirects to `/thank-you` itself).
- Whether a subscriber created as `active` and then added to the form also gets the confirmation email was not established (and is not needed).
- A person who unsubscribed and signs up again: Kit says re-subscribing needs explicit permission. The sign-up form is that permission, but how Kit treats a `cancelled` subscriber added to a form is to be tested in step 1.3.
- The immediate attempt after the request runs in a FastAPI background task (so the answer's timing does not reveal whether an address is new). Proven on a Vercel preview on 2026-11-08: the request returned 202, then the Kit subscriber was created and added to the form (both 201), and after the confirmation link the subscriber was `active`. The outbox cron stays as the fallback.
- Webhook (built 2026-11-07, from Kit's docs; not yet seen with a real delivery): `POST /v1/webhooks/kit` checks `X-Kit-Signature` (`t=<unix>,v1=<hex>`, HMAC-SHA256 of `{t}.{raw body}`, key = the whole `whsec_...` secret as UTF-8, 5 minute tolerance, any matching `v1` during rotation), dedupes on each event's `id`, and answers 2xx only when every event is handled (Kit retries 8 times over about 41 hours; 410 stops it). The key format is inferred from Kit's example code: confirm it with the first real delivery. Subscribed events: `subscriber.activated`, `.unsubscribed`, `.bounced`, `.complained` (plain strings in the `events` array). Kit shows the secret only when the endpoint is created or rotated.
- How Kit reaches the protected API project (decided 2026-11-08): Kit calls a route on the web project, `POST /api/webhooks/kit` (`apps/web/src/lib/kit-webhook.ts`), which forwards the untouched body and `X-Kit-Signature` to `/v1/webhooks/kit` and adds the API project's Vercel bypass secret on the server. Chosen over putting the bypass secret in the registered URL because that secret would then sit at Kit (and in its delivery logs) and is project-wide. No service token is sent (the signature is the credential); the API's answer is relayed as a bare status so Kit retries failures; a body over 1 MB is refused; an unreachable API gives 502. Consequences: register `https://wordonthewater.net/api/webhooks/kit` only once the domain is attached and the web project redeployed; preview deployments are behind Vercel's login wall too, so Kit cannot reach a preview address and the route is tested by unit and e2e tests instead. Kit webhooks are account-wide, so sign-ups from the preview test form also reach the production endpoint; the API ignores people it has no record of.
- Broadcasts: mechanics proven 2026-11-14 (next section); the code that creates them is built in PLAN.md 2.4.

## Broadcast spike (preview key, 2026-11-14)

Real calls with the preview key against the one Kit account (the preview and live keys share it; only the form differs, so tags and broadcasts are shared and every broadcast needs an explicit audience). Subscribers at the time: one test address.

- **Create:** `POST /v4/broadcasts` works on the free plan (201) as a draft: `public: false`, `send_at: null`. Defaults if not sent: template "Text only", sender `hello@wordonthewater.net`, audience **all subscribers**. Set `subscriber_filter` (`[{"all":[{"type":"tag","ids":[...]}]}]`) every time.
- **Schedule:** `PUT /v4/broadcasts/{id}` with `send_at`: `draft`, `scheduled`, then `completed` at the time. `send_at: null` returns it to `draft`. **A PUT resets fields it does not carry**: a PUT with only `send_at` changed the sender from the requested address back to `hello@`. Send the full set (sender, audience, template, `send_at`) and read it back before the send time.
- **Footer:** with the "Text only" template Kit adds `Unsubscribe | Update your profile | <postal address>` itself, so our content needs no `{{ unsubscribe_url }}` or `{{ address }}`. The free plan also adds a "Built with Kit" badge.
- **Formatting:** headings, paragraphs, bold, italic, links and lists render. `blockquote` loses its styling (plain small text), so scripture quotations need inline styles.
- **Test send:** no API call found. The test is a tag-limited audience (stats showed `recipients: 1`).
- **Delete:** only drafts; a sent broadcast returns 422 "Broadcast has already been sent."
- **Subscribers:** an upsert on an existing `inactive` subscriber does not change its state and the API cannot activate one; a new address created with `state: "active"` skips double opt-in (used for the test). The API cannot delete subscribers. `GET /v4/tags/{id}/subscribers` returned an empty list while the subscriber's own tag list showed the tag: trust the subscriber side and the broadcast's `recipients`.
- **Delivery (the open risk):** DNS for `wordonthewater.net` has DMARC `p=reject` with strict alignment, SPF `include:mailgun.org` only (no Kit) and Mailgun MX (Squarespace forwarding). Kit's confirmation email (From `hello@`) and a broadcast whose sender had reset to `hello@` did not reach Gmail; a broadcast from a verified Gmail sender arrived in the spam folder. The cause is very likely DMARC rejecting unauthenticated mail from `hello@`, but Kit's API gives no delivery log, so it is not proven. **Authenticating Kit's sending domain (DKIM) is a prerequisite for sign-up confirmations and for every weekly send.** Delivery from `hello@` after DKIM is still to be proven.

## Operational findings (preview, 2026-11-08)
- A Turnstile widget refuses every hostname not on its list (error 110200, "domain not allowed"). The production widget lists only `wordonthewater.net` and `www.wordonthewater.net`, so production sign-up cannot be tested on a `*.vercel.app` address.
- Kit webhooks are account-wide: sign-ups through the preview test form also send events to the production endpoint. The API ignores people it has no record of.
- Registering the webhook and the Kit form redirect need the live domain, so they are launch-time steps (`docs/production_checklist.md`, Part H; the guide is `docs/kit_webhook_checks.md`).

## Consequences
- A Kit outage never loses a sign-up: both calls run from the outbox with retries; a repeat of either is harmless.
- Our `subscribers` table mirrors Kit (status, consent evidence, retention); if the two disagree, Kit wins.
- The 120 requests per minute per key limit applies; back off on 429.
- Tests use a fake Kit server and never call real Kit.
