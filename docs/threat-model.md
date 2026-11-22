# Threat model v1

STRIDE threat model for Word on the Water. Version 1, written 2026-10-31 at the end of Phase 0, before any personal data is collected.

**Status column:** *Done* is in the code today and was checked; *Planned (step)* is designed but not built, with the PLAN.md step that builds it; *Open* is a known gap with no decision yet.

**Update this file** whenever a feature adds data, an endpoint, a third party or a trust boundary (CLAUDE.md section 14), and re-read it at each phase gate.

## System and trust boundaries

```
Browser ──(1)──> Vercel edge + Firewall ──> Next.js (apps/web, wotw-web)
                                               │ (2) server-to-server, service token + X-Client-IP
                                               ▼
Vercel Cron ──(6)──────────────────────> FastAPI (apps/api, wotw-api)
Kit ──(5) signed webhook ──> web /api/webhooks/kit ──(2)──>  │            │             │
                                           │(3)         │(4)          │(4)
                                           ▼            ▼             ▼
                                     Neon Postgres  Upstash Redis  Kit, Postmark, Turnstile
GitHub Actions ──(7)──> Vercel (Git integration), Neon (preview cleanup)
```

| Boundary | Crossing | Control at the boundary |
|---|---|---|
| 1 | Internet to web | HTTPS, HSTS, Vercel Firewall, nonce CSP, Turnstile on the sign-up form (Done; contact and prayer forms Planned) |
| 2 | Web to API | Service token, Deployment Protection with bypass secret; the browser never calls the API |
| 3 | API to Neon and Upstash | TLS (verify-full to Neon), least-privilege role, secrets in Vercel |
| 4 | API to third parties | HTTPS with provider tokens; minimum data sent |
| 5 | Kit to web to API | Kit calls a public forwarder route on the web project (it cannot pass the API project's login wall); the forwarder passes the raw body and signature on, adds the bypass secret server-side, relays only a status, caps the body at 1 MB; the API then checks the signature over the raw body, 5 minute window, event-id dedupe, 1 MB body cap (Done, step 1.3; registration at launch) |
| 6 | Vercel Cron to API | `CRON_SECRET` bearer |
| 7 | CI and Git to hosting | Branch protection, least-privilege workflows, pinned actions |

## Assets

| Asset | Class | Where |
|---|---|---|
| Prayer requests | Special category (religious belief, health, family) | Neon, encrypted at rest at application level (planned, step 1.4) |
| Subscriber email and first name | Personal data | Kit (source of truth) and a mirror in Neon |
| Contact messages | Personal data | Neon |
| Hashed IP and email rate-limit keys | Pseudonymous | Upstash |
| Secrets: service token, cron secret, DB and Redis credentials, Kit token, Postmark token, encryption key | Critical | Vercel Sensitive variables |
| Source code and CI | Integrity | Public GitHub repository |

Actors considered: anonymous internet attacker, abusive bot or spammer, a visitor trying to read or poison another's data, a compromised dependency, a leaked credential. Not considered in v1: a malicious maintainer, nation-state attackers, physical access.

## STRIDE

### Spoofing

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| S1 | A caller pretends to be the web app and calls the API directly | Default-deny `/v1` router behind the service token, compared in constant time as bytes; API project behind Deployment Protection | Done |
| S2 | A caller forges `X-Client-IP` to dodge or poison rate limits | Trusted only after the service token check; missing or malformed values fall back to the proxy address and log `client_ip_fallback`; IPv6 limited per /64 | Done |
| S3 | A forged Kit webhook changes subscriber status (the receiver is built but not registered at launch: Kit's free plan has no webhooks) | HMAC-SHA256 over `{t}.{raw body}` with the endpoint secret, constant-time compare, 5 minute tolerance, any matching `v1` (rotation); 401 with one generic code; the route has no service token and a test proves every other `/v1` route does | Done (key format to confirm with a real delivery) |
| S4 | A forged cron call triggers the outbox | `CRON_SECRET` bearer | Done |
| S5 | Someone sends mail that looks like ours | SPF, DKIM, DMARC on the root domain, starting `p=none` | Planned (1.9) |

### Tampering

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| T1 | Oversized or malformed requests | 16 KB body limit counted on bytes received (also chunked), 1 MB only for the Kit webhook; Pydantic `extra="forbid"` with length limits on every endpoint | Limit Done; sign-up schema Done; contact and prayer Planned (1.4, 1.5) |
| T2 | SQL injection | SQLAlchemy bound parameters only | Done |
| T3 | Script injection (XSS) | Per-request nonce CSP, `frame-ancestors 'none'`, no user content rendered as HTML | Done |
| T4 | Tampered dependency or workflow | Lockfiles, Dependabot, pip-audit, pnpm audit, OSV-Scanner, CodeQL, gitleaks, Bandit, actions pinned to SHAs | Done |
| T5 | Prayer data altered in the database | AES-256-GCM with authentication tag, key id per row | Planned (1.4) |

### Repudiation

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| R1 | No record of who viewed or changed a prayer request | `audit_log` table exists; writes arrive with the admin UI. Request IDs tie logs to responses today | Partial; Planned (Phase 2) |
| R2 | Webhook replay or duplicate delivery | The 5 minute window rejects a captured delivery replayed later; each event id is claimed in Redis (given back if handling fails, so Kit's retry works); status updates are idempotent | Done |

### Information disclosure

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| I1 | Prayer text leaks through logs, error tracking, analytics or email | Never logged; Sentry `before_send` scrubbing and `sendDefaultPii: false`; notification email carries the text only with consent; encrypted at rest; a log-capture test (`test_log_privacy.py`) proves no body, email, token or exception text is logged | Partly done (logs and Sentry in 0.10; email and encryption in 1.4) |
| I2 | Subscriber enumeration through sign-up responses | Identical 202 whether the email is new, pending, confirmed, unsubscribed, bounced or a caught bot; the Kit call runs after the response so timing does not differ; the per-email limit answers every address alike | Done |
| I3 | Secrets reach the repository or the client bundle | gitleaks in pre-commit and CI; `server-only`; only non-secret `NEXT_PUBLIC_*` reach the browser | Done; `scripts/check_bundle_secrets.py` runs in CI after the web build |
| I4 | Stack traces or internals in errors | One error shape; unhandled errors log type and location only, never the message | Done |
| I5 | API schema and docs exposed | `/docs` and `/openapi.json` off in production | Done |
| I6 | Data in transit read | HTTPS with HSTS; TLS verify-full to Neon; TLS to Upstash | Done |
| I7 | Production data exposed through preview deployments | Deployment Protection on previews; separate secrets where possible. Previews branch from the data-free `preview-base`, with their own roles, passwords and Upstash database (R-1 to R-3, closed 2026-11-01) | Done |

### New in step 1.3

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| K1 | Kit holds subscriber emails (a new third party with personal data) | Data minimised to email, first name and the consent referrer; Kit is the processor, deletable in both places; the API key is a Sensitive variable on the API project only, a separate test form or account outside Production | Done in code; Vercel variables Planned (1.9) |
| K2 | The Kit API key or webhook secret leaks | Never logged or in an error message; the webhook secret is written to `.env` by the registration tool and never printed; gitleaks; `server-only` | Done |
| K3 | A bot gets a sign-up through without a real check | Turnstile token verified server-side on every sign-up; if Cloudflare cannot judge it, 503 and nothing stored; production refuses Cloudflare's always-pass test secrets | Done |
| K4 | A confirmation link is used to confirm someone else | Kit issues and expires the confirmation; we hold no tokens | Done (by design, ADR 0008) |
| K5 | The public forwarder `/api/webhooks/kit` is used to reach the API without credentials, or to send it load | It sends no service token and relays nothing from the API (a bare status); a body over 1 MB is refused; the API verifies the signature before doing anything, so an unsigned call is a 401; the bypass secret never leaves the server | Done (step 1.3); a Firewall rate-limit rule on the route is a launch step |
| K6 | The weekly email goes to the wrong audience, or goes out unreviewed | The command creates a draft only (`send_at` null, `public` false); the audience must be chosen (`--tag` or `--all`); the send is scheduled by hand in Kit. Kit resets omitted fields on update and defaults a new broadcast to all subscribers, so every field is sent | Done (2.4, ADR 0008) |
| K7 | The Kit API key sits on the owner's machine with full-account scope; the preview and live keys are one account | The command reads the gitignored root `.env`, never prints the key, and its errors carry only the status; gitleaks in pre-commit and CI. Drafts hold public devotional text and the command never lists or reads subscribers | Accepted; revisit when sending moves to the API |
| K8 | Mail from `hello@` is rejected, or can be spoofed, because DKIM and SPF do not cover Kit while DMARC is `p=reject` | Authenticate Kit's sending domain (DKIM), merge Kit into the one SPF record, then prove delivery with a tag-limited test before any real send | Done for the test send (2026-11-21: a tag-limited test broadcast from `hello@` landed in the inbox with SPF, DKIM and DMARC all passing); the first real send and the DMARC reports after two weeks are in production_checklist.md Part K and post_launch.md |
| K9 | The daily Kit sync reads every subscriber address with the Kit API key, and the route is called by someone else | Read-only `GET` to Kit with the same Sensitive key as K1 and K2; `/cron/sync-kit` needs `CRON_SECRET` (401 otherwise, tested); it logs counts only, never an address (tested); it updates rows we already have and creates none; it exists because Kit's webhooks need a paid plan (ADR 0008) | Done |
| K10 | The sync stops working and the retention job then deletes pending rows, including people who confirmed in Kit | The sync runs at 03:00 UTC, before retention at 03:30; Kit still holds the real list and its own confirmation record; a failed run changes nothing and the next run repeats it; the first-week check in production_checklist.md Part J looks for `kit_synced` every day | Open: add an alert on a missing or failing sync, and the Kit auth-failure alert (PLAN.md 1.3, runbooks/alerts.md) |
| K11 | A stranger signs up other people's addresses through Kit's own hosted form page, which skips our Turnstile, honeypot and rate limits, and each address gets a confirmation email from our sender | The page's address is not in the repository and is sent only to individual returning readers; Invisible reCAPTCHA is on for that form (2026-11-21); double opt-in means nothing is sent to anyone who does not confirm; auto-confirm is off; our own site never uses the hosted page | Done; residual risk is the address leaking (the page sends data to Google through reCAPTCHA, see privacy.md) |

### New in the Ask the Word chat (step 1.10, built behind `CHAT_ENABLED`)

A visitor types free text; the API answers from a local knowledge base. No model, no third party, nothing stored (ADR 0009).

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| C1 | A visitor types personal details (name, phone, ID number, address) | Rejected before any other use (patterns for emails, phones including +27, long digit runs, card numbers, South African ID numbers, URLs, "my name is" forms); not logged or stored; a visible line above the input; patterns are bounded and run on input capped at 300 characters (no regex denial of service) | Done. Proof: `tests/test_chat_guards.py` (96 cases) |
| C2 | Someone in crisis gets a theology lesson or a wrong answer | A deterministic crisis check runs first and returns the knowledge base's fixed crisis text (SADAG, LifeLine, emergency services, a line for visitors outside South Africa); tested with positive and negative phrases | Done. Proof: `tests/test_chat_guards.py`, `tests/test_chat.py`, e2e `chat.spec.ts` (crisis reply) |
| C3 | A wrong or unreviewed doctrinal answer | Contested entries carry the badge and the contested note; the knowledge base version is in every reply; answers are fixed text, not generated | Done. Proof: `tests/test_kb.py`, `tests/test_chat.py` (every contested entry carries the note). No pastoral review gate (decided 2026-11-15): a wrong answer stays possible, so every answer points to a pastor and the content is changed by pull request |
| C4 | The knowledge base is tampered with (repo, build, deploy) | Changes only by reviewed pull request; the committed JSON is checked against the markdown by `make kb-check` in CI; Pydantic validation on load; a test that no field holds HTML and every id resolves | Done. Proof: `make kb-check` in CI, `tests/test_kb_build.py`, `tests/test_kb.py` |
| C5 | Flooding or expensive queries | Rate limit per hashed visitor address, input cap, constant-size in-memory index, no external calls, Vercel Firewall rule on the route, `CHAT_ENABLED=0` kill switch | Done. Proof: `tests/integration/test_chat.py` (30 per 10 minutes, 429 with Retry-After, 503 kill switch); the Firewall rule is a launch step |
| C6 | Cross-site scripting through a reply or the echoed question | Everything rendered as plain text by React; no `dangerouslySetInnerHTML`; no external links in answers; verse links are internal and built from validated references | Done. Proof: `tests/unit/chat-panel.test.tsx` (a `<script>` reply is shown as text; no `dangerouslySetInnerHTML`) |
| C7 | Forged `last_entry_id` or `seen_entry_ids` | Validated against the knowledge base; the only effect is which genuine entry is ranked higher; no model to manipulate | Done. Proof: `tests/test_chat.py` and `tests/integration/test_chat.py` (a forged context is a `bad_context` reply) |
| C8 | Message text leaks into logs, Sentry or analytics | Only counts, the outcome kind and the matched entry id are logged; a test asserts a message never appears in logs or Sentry events | Done. Proof: `tests/integration/test_chat.py` (a marker never reaches logs, errors or the Sentry scrubber; the test is shown to fail when a message is logged) |
| C9 | Chat history is seen by the next person on a shared device | Thread kept in `sessionStorage` only (gone when the tab closes), a Clear chat button, nothing on the server | Done. Proof: `tests/unit/chat-panel.test.tsx` and `tests/e2e/chat.spec.ts` (reload keeps the thread, a new tab does not, Clear chat empties the storage) |

### New in the prayer crew (proposed 2026-11-22, ADR 0012, nothing built)

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| PC1 | Someone reads another person's prayer request (broken access control) | One service function answers every read: author, or a share row plus a crew in common, checked on each read; default deny; a "someone else's request" test on every endpoint | Planned |
| PC2 | Prayer text leaks through logs, Sentry, analytics or email | Same rules as I1; no prayer text in any email (sign-in and invite emails carry none); encrypted at rest (ADR 0006); a log-capture test | Planned |
| PC3 | The encryption key is lost or leaked | Sensitive variable on the API project only, key id per row, rotation and a key backup in the rotate-secrets runbook; backups hold ciphertext only | Planned |
| PC4 | Account enumeration through sign-in or invites | Same response whether or not an address has an account; invites never reveal membership | Planned |
| PC5 | Magic-link abuse: guessing, replay, email flooding of a victim | 256-bit random token, stored hashed, single use, 15 minutes; rate limits per hashed IP and per address; Turnstile on the send step | Planned |
| PC6 | Session theft or fixation | Opaque id in a `__Host-` `HttpOnly; Secure; SameSite=Lax` cookie; a new id on sign-in; revoke on sign-out; 30 days idle | Planned |
| PC7 | Invite spam, or a leaked or forwarded invite link | Owner-only invites, verified users only, 10 pending per crew, per-user and per-address rate limits, one email per invite, single use, 7 days, owner can revoke | Planned |
| PC8 | A stranger's address is kept as an invitee | Kept only until the invite closes or expires, deleted by the retention job, named in the privacy policy | Planned |
| PC9 | Cross-site request forgery on crew and prayer actions | Server Actions origin check, `SameSite=Lax`, state changes only by POST | Planned |
| PC10 | A removed member keeps seeing requests | Shares count only while author and recipient share a crew, checked on every read | Planned |
| PC11 | Account deletion leaves data behind | One deletion path removes requests, shares, memberships and invites, with a test | Planned |
| PC12 | Sign-in emails land in spam or are rejected (DMARC `p=reject`, strict alignment) | Postmark DKIM and return path set up first, tested to Gmail; a typed code as a fallback | Planned |

### Denial of service

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| D1 | Form flooding | Redis sliding-window limiter (atomic, rejected hits do not extend the window), Turnstile, honeypot and minimum time, Idempotency-Key, Vercel Firewall rules | Sign-up Done; contact and prayer Planned (1.4, 1.5); Firewall rules Planned (1.9) |
| D2 | Redis outage or slowness | Read and connect timeouts of 2 s; rate-limited routes fail closed (500) so forms never accept unlimited requests | Done, accepted |
| D3 | Sign-up used to spam third parties | Double opt-in (Kit sends the confirmation), 5 an hour per address and 3 an hour per email, Turnstile | Done |
| D4 | The deployment pipeline is blocked (observed: Hobby quota refused deployments) | `docs/**` branches do not deploy; Pro before launch | Mitigated; Planned (1.9) |
| D5 | One outbox send stalls the cron run | Per-send cap of 8 s inside a 20 s budget under a 30 s function limit | Done |

### Elevation of privilege

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| E1 | Stolen runtime credentials alter the schema | `app_runtime` has DML only; `app_migrator` (DDL) is used by migrations only | Done |
| E2 | An admin endpoint is reachable without permission (Phase 2) | Permission dependency on every endpoint, default deny, passkey or magic link plus a second factor | Planned (Phase 2) |
| E3 | A compromised workflow or action gains write access | Read-only default permissions, pinned actions, no Vercel token in CI | Done |
| E4 | Account takeover of Vercel, Neon, Upstash, Kit, Postmark, GitHub or the registrar | Two-factor on every account, a registrar lock | Open: owner action, not verifiable from the repository |

## Known gaps and decisions needed

These came from the setup, not from code defects. R-1 to R-4 were closed on 2026-11-01, before real personal data existed; the table is kept as a record.

| ID | Gap | Why it matters | Action | Status |
|---|---|---|---|---|
| R-1 | Neon preview branches are created from `main` and copy its data | Once production holds subscribers or prayer requests, every preview database holds a copy, reachable from preview code | Branch previews from a data-free base branch, or turn off per-preview branching for the production project | Closed 2026-11-01 |
| R-2 | Preview and production share the role passwords (Neon branches copy roles), and the `NEON_*` variables are not Sensitive | A preview variable shown in the Vercel dashboard or leaked from a build is also a working production credential | Give preview its own roles and passwords, mark the variables Sensitive where the integration allows, rotate after the change | Closed 2026-11-01 |
| R-3 | Preview and production share one Upstash Redis | A preview can exhaust or pollute production rate limits | A separate Upstash database for preview, or a key prefix per environment | Closed 2026-11-01 |
| R-4 | CLAUDE.md section 6.6 says previews never get production keys | The statement is not true for R-2 and R-3 | Reword now, restore the rule once R-1 to R-3 are fixed | Closed 2026-11-01 |
| R-5 | After production `main` was restored from `preview-base` (2026-11-08), `main` is a child of `preview-base` and may carry its roles and passwords | A shared password lets preview code reach production; "Reset from parent" on `main` would overwrite production with preview data | Reset the production role passwords on `main`, keep them different from preview, never reset `main` from its parent | Closed 2026-11-08 (passwords reset; the lineage is recorded in the deploy runbook) |
Residual risks accepted for Phase 1: the Hobby plan's limits until launch; DMARC at `p=none` for the first weeks; delivery through the `hello@` and `prayer@` forwards depending on Squarespace forwarding.

## Out of scope for v1

Admin authentication and sessions (modelled when Phase 2 starts), audio uploads (Phase 3), public accounts and comments (Phase 4), a native mobile app.
