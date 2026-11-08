# 0008. Kit for subscriptions and newsletters

Status: accepted (sign-up flow proven by a spike on 2026-11-07; webhooks and broadcasts still to be proven)

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
- The immediate attempt after the request runs in a FastAPI background task (so the answer's timing does not reveal whether an address is new). Whether Vercel lets it finish after the response is sent is to be proven on a preview deployment; the outbox cron is the fallback either way.
- Webhook (built 2026-11-07, from Kit's docs; not yet seen with a real delivery): `POST /v1/webhooks/kit` checks `X-Kit-Signature` (`t=<unix>,v1=<hex>`, HMAC-SHA256 of `{t}.{raw body}`, key = the whole `whsec_...` secret as UTF-8, 5 minute tolerance, any matching `v1` during rotation), dedupes on each event's `id`, and answers 2xx only when every event is handled (Kit retries 8 times over about 41 hours; 410 stops it). The key format is inferred from Kit's example code: confirm it with the first real delivery. Subscribed events: `subscriber.activated`, `.unsubscribed`, `.bounced`, `.complained` (plain strings in the `events` array). Kit shows the secret only when the endpoint is created or rotated.
- How Kit reaches the protected API project (decided 2026-11-08): Kit calls a route on the web project, `POST /api/webhooks/kit` (`apps/web/src/lib/kit-webhook.ts`), which forwards the untouched body and `X-Kit-Signature` to `/v1/webhooks/kit` and adds the API project's Vercel bypass secret on the server. Chosen over putting the bypass secret in the registered URL because that secret would then sit at Kit (and in its delivery logs) and is project-wide. No service token is sent (the signature is the credential); the API's answer is relayed as a bare status so Kit retries failures; a body over 1 MB is refused; an unreachable API gives 502. Consequences: register `https://wordonthewater.net/api/webhooks/kit` only once the domain is attached and the web project redeployed; preview deployments are behind Vercel's login wall too, so Kit cannot reach a preview address and the route is tested by unit and e2e tests instead. Kit webhooks are account-wide, so sign-ups from the preview test form also reach the production endpoint; the API ignores people it has no record of.
- Broadcasts: proven in their own step.

## Consequences
- A Kit outage never loses a sign-up: both calls run from the outbox with retries; a repeat of either is harmless.
- Our `subscribers` table mirrors Kit (status, consent evidence, retention); if the two disagree, Kit wins.
- The 120 requests per minute per key limit applies; back off on 429.
- Tests use a fake Kit server and never call real Kit.
