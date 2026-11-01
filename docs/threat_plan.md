# Threat plan

Work plan to close every threat in [threat-model.md](threat-model.md) that is not yet *Done*. Work top to bottom, one section per branch and PR (CLAUDE.md section 14). Tick a box only when the work is validated, and update the Status column in the threat model in the same PR.

Threats already *Done* (S1, S2, S4, T2, T3, T4, I4, I5, I6, E1, E3, D2, D5) need no work. Their only follow-up is the re-check in section 9.

Order follows the dependency: gaps that must close before real data (section 1), then the Phase 1 steps that build the controls.

## 1. Before real personal data exists (R-1 to R-4, I7)

Deadline: before step 1.3 starts collecting anything.

- [x] **R-1** Stop preview databases copying production data: branch previews from a data-free base branch, or turn off per-preview Neon branching for the production project. Verify a preview database contains no rows from `main`. *Done 2026-11-01, verified.*
- [x] **R-2a** Give preview its own Neon roles and passwords (not copies of production's). *Done 2026-11-01, verified.*
- [x] **R-2b** Mark the `NEON_*` variables Sensitive where the integration allows. *Done 2026-11-01.*
- [x] **R-2c** Rotate the production Neon credentials after the change (runbook: `docs/runbooks/rotate-secrets.md`). *Done 2026-11-01; production `/api/health` returns ok.*
- [x] **R-3** Separate Upstash database for preview, or a key prefix per environment. Verify a preview cannot touch production rate-limit keys. *Done 2026-11-01, verified.*
- [x] **R-4** Reword CLAUDE.md section 6.6 now so it states the truth, then restore the "previews never get production keys" rule once R-1 to R-3 are done.
- [x] **I7** Re-check Deployment Protection on previews and confirm no production secret is visible in Preview scope. Mark I7 Done in the threat model.

## 2. Phase 0 exit (step 0.10)

- [x] **I1 (part)** Sentry in web and API with `before_send` scrubbing and `sendDefaultPii: false`. Test: an event containing a fake email and prayer text arrives scrubbed.
- [x] **I1 (part)** Confirm no request body, email or prayer text reaches logs (test with a captured log stream).
- [x] **I3** Client bundle check: build the web app and grep the output for every secret name and value pattern. Add it to CI or the exit gate. *Done: `scripts/check_bundle_secrets.py`, run in the Web CI job after the build.*
- [ ] **R1 (part)** Request IDs appear in every API log line and response header (already true; add a test if missing).

## 3. Step 1.3: subscribers and Kit

- [ ] **T1 (sub)** Pydantic schema for `POST /v1/subscribers` with `extra="forbid"` and limits (name 80, email 254). Test: unknown field, oversize, bad email all rejected.
- [ ] **D1 (sub)** Wire the rate limiter to sign-up: per hashed IP and per email. Test: the limit trips and returns a generic 429.
- [ ] **D1 (sub)** Turnstile verification in the API, honeypot field and minimum time-to-submit. Test each rejection path with fakes.
- [ ] **D3** Double opt-in confirmed through Kit; limits and Turnstile in place. Test: a flood from one IP/email sends at most the limit to Kit.
- [ ] **I2** Identical 202 body and similar timing for new, pending and confirmed emails, and whether or not Kit succeeded. Test all four cases return the same response.
- [ ] **S3** Kit webhook signature check: `X-Kit-Signature` `t=...,v1=...`, HMAC-SHA256 over `{t}.{raw body}`, constant-time compare, 5 minute tolerance, any matching `v1` accepted. Tests: valid, bad signature, stale timestamp, tampered body, rotation with two `v1` values.
- [ ] **R2** Dedupe webhook events on event id; handlers idempotent. Test: the same event twice changes state once.
- [ ] **Secrets** `KIT_API_KEY` and `KIT_WEBHOOK_SECRET` Sensitive on the API project only; Preview uses a separate Kit test form or account.
- [ ] Threat model updated for the new endpoints and Kit as a processor (CLAUDE.md section 14 checklist).

## 4. Step 1.4: prayer requests

- [ ] **T1 (sub)** Schema for `POST /v1/prayer-requests`: `extra="forbid"`, text at most 2,000 chars. Tests as in 3.
- [ ] **T5** AES-256-GCM envelope encryption with the key id stored per row, key in Vercel Sensitive variables. Tests: round trip, tampered ciphertext fails, key rotation reads old rows.
- [ ] **I1 (part)** Notification email holds the request text only when the requester ticked consent, otherwise "a new request is waiting". Test both.
- [ ] **I1 (part)** Prayer text absent from logs, Sentry and error responses. Test with a captured log stream and a forced exception.
- [ ] **D1 (sub)** Rate limit (3/hour/IP), Turnstile, honeypot on prayer requests.
- [ ] Retention: `delete_after` set on every row (job arrives in 1.9).
- [ ] Threat model updated.

## 5. Step 1.5: contact form

- [ ] **T1 (sub)** Schema for `POST /v1/contact` with `extra="forbid"` and limits.
- [ ] **D1 (sub)** Rate limit, Turnstile, honeypot.
- [ ] Contact text kept out of logs and Sentry. Test as in 4.
- [ ] Threat model updated.

## 6. Step 1.9: launch hardening

- [ ] **D1 (final)** Vercel Firewall rate-limit rules on the form routes; Attack Challenge Mode noted in the incident runbook.
- [ ] **D4** Move to Vercel Pro so deployments are not blocked by Hobby quotas.
- [ ] **S5** SPF (one merged record), DKIM per sender, DMARC at `p=none` with reports to `hello@`, custom return-paths, Kit sending domain. Verify with a test send to an external mailbox.
- [ ] **S5 (later)** Move DMARC to `quarantine` after a few weeks of clean reports.
- [ ] End-to-end test of notification delivery through the `hello@` and `prayer@` forwards; fall back to direct inboxes if unreliable (accepted risk).
- [ ] Retention job (daily cron): unconfirmed subscribers 7 days, prayer requests 90 days, contact messages 12 months, audit logs 1 year. Test each deletion.
- [ ] Tested restore from backup (`docs/runbooks/restore-db.md`).
- [ ] ZAP baseline scan clean of high findings.

## 7. Owner actions (E4)

Not verifiable from the repository. Hendrik ticks these and notes the date.

- [ ] Two-factor on GitHub, Vercel, Neon, Upstash, Kit, Postmark.
- [ ] Two-factor on Squarespace (domain and DNS) and the registrar lock enabled.
- [ ] Recovery codes stored offline.
- [ ] Vercel audit log enabled (Pro).

## 8. Phase 2 gate (not now)

- [ ] **E2** Permission dependency on every admin endpoint, default deny; passkey or magic link plus a second factor. Test: each admin route returns 403 without its permission.
- [ ] **R1** Audit log writes for every view or change of a prayer request, with actor and hashed IP. Test the row is written.
- [ ] Extend the threat model for admin sessions (`__Host-` cookies, 30 minute idle timeout).

## 9. Re-check of Done items

Run at each phase gate and after any change to the area.

- [ ] S1 and S4: calls without the service token or `CRON_SECRET` return 401 in the integration tests.
- [ ] S2: a forged `X-Client-IP` without a valid token is ignored.
- [ ] T3: CSP header present and enforced in production (`CSP_REPORT_ONLY` off).
- [ ] T4: CI security workflows green; Dependabot PRs reviewed.
- [ ] I5: `/docs` and `/openapi.json` return 404 in production.
- [ ] E1: `app_runtime` cannot run DDL (try `CREATE TABLE` as that role).

## Residual risks accepted for Phase 1

Hobby plan limits until launch (D4), DMARC at `p=none` for the first weeks (S5), delivery through Squarespace forwards. Revisit at the launch gate.
