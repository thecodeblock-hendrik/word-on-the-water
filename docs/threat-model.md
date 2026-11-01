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
Kit ─────────(5) signed webhook ───────>   │            │             │
                                           │(3)         │(4)          │(4)
                                           ▼            ▼             ▼
                                     Neon Postgres  Upstash Redis  Kit, Postmark, Turnstile
GitHub Actions ──(7)──> Vercel (Git integration), Neon (preview cleanup)
```

| Boundary | Crossing | Control at the boundary |
|---|---|---|
| 1 | Internet to web | HTTPS, HSTS, Vercel Firewall, nonce CSP, Turnstile on forms (planned) |
| 2 | Web to API | Service token, Deployment Protection with bypass secret; the browser never calls the API |
| 3 | API to Neon and Upstash | TLS (verify-full to Neon), least-privilege role, secrets in Vercel |
| 4 | API to third parties | HTTPS with provider tokens; minimum data sent |
| 5 | Kit to API | Webhook signature (planned, step 1.3) |
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
| S3 | A forged Kit webhook changes subscriber status | Verify the signature over the raw body, answer fast, idempotent handlers | Planned (1.3) |
| S4 | A forged cron call triggers the outbox | `CRON_SECRET` bearer | Done |
| S5 | Someone sends mail that looks like ours | SPF, DKIM, DMARC on the root domain, starting `p=none` | Planned (1.9) |

### Tampering

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| T1 | Oversized or malformed requests | 16 KB body limit counted on bytes received (also chunked); Pydantic `extra="forbid"` with length limits on every endpoint | Limit Done; schemas Planned (1.3 to 1.5) |
| T2 | SQL injection | SQLAlchemy bound parameters only | Done |
| T3 | Script injection (XSS) | Per-request nonce CSP, `frame-ancestors 'none'`, no user content rendered as HTML | Done |
| T4 | Tampered dependency or workflow | Lockfiles, Dependabot, pip-audit, pnpm audit, OSV-Scanner, CodeQL, gitleaks, Bandit, actions pinned to SHAs | Done |
| T5 | Prayer data altered in the database | AES-256-GCM with authentication tag, key id per row | Planned (1.4) |

### Repudiation

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| R1 | No record of who viewed or changed a prayer request | `audit_log` table exists; writes arrive with the admin UI. Request IDs tie logs to responses today | Partial; Planned (Phase 2) |
| R2 | Webhook replay or duplicate delivery | Dedupe on event id, idempotent handlers | Planned (1.3) |

### Information disclosure

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| I1 | Prayer text leaks through logs, error tracking, analytics or email | Never logged; Sentry `before_send` scrubbing and `sendDefaultPii: false`; notification email carries the text only with consent; encrypted at rest | Planned (0.10, 1.4) |
| I2 | Subscriber enumeration through sign-up responses | Identical 202 whether the email is new, pending or confirmed, and whether Kit succeeded | Planned (1.3) |
| I3 | Secrets reach the repository or the client bundle | gitleaks in pre-commit and CI; `server-only`; only non-secret `NEXT_PUBLIC_*` reach the browser | Done; bundle check at the Phase 0 exit gate |
| I4 | Stack traces or internals in errors | One error shape; unhandled errors log type and location only, never the message | Done |
| I5 | API schema and docs exposed | `/docs` and `/openapi.json` off in production | Done |
| I6 | Data in transit read | HTTPS with HSTS; TLS verify-full to Neon; TLS to Upstash | Done |
| I7 | Production data exposed through preview deployments | Deployment Protection on previews; separate secrets where possible. **Gap:** see R-1 to R-3 below | Open |

### Denial of service

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| D1 | Form flooding | Redis sliding-window limiter (atomic, rejected hits do not extend the window), Turnstile, honeypot, Vercel Firewall rules | Limiter Done; wiring Planned (1.3 to 1.5, 1.9) |
| D2 | Redis outage or slowness | Read and connect timeouts of 2 s; rate-limited routes fail closed (500) so forms never accept unlimited requests | Done, accepted |
| D3 | Sign-up used to spam third parties | Double opt-in, per-IP and per-email limits, Turnstile | Planned (1.3) |
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

These come from the current setup, not from code defects. Resolve them before real personal data exists (the start of Phase 1 step 1.3 at the latest).

| ID | Gap | Why it matters | Proposed action |
|---|---|---|---|
| R-1 | Neon preview branches are created from `main` and copy its data | Once production holds subscribers or prayer requests, every preview database holds a copy, reachable from preview code | Branch previews from a data-free base branch, or turn off per-preview branching for the production project |
| R-2 | Preview and production share the role passwords (Neon branches copy roles), and the `NEON_*` variables are not Sensitive | A preview variable shown in the Vercel dashboard or leaked from a build is also a working production credential | Give preview its own roles and passwords, mark the variables Sensitive where the integration allows, rotate after the change |
| R-3 | Preview and production share one Upstash Redis | A preview can exhaust or pollute production rate limits | A separate Upstash database for preview, or a key prefix per environment |
| R-4 | CLAUDE.md section 6.6 says previews never get production keys | The statement is not true for R-2 and R-3 | Reword now, restore the rule once R-1 to R-3 are fixed |

Residual risks accepted for Phase 1: the Hobby plan's limits until launch; DMARC at `p=none` for the first weeks; delivery through the `hello@` and `prayer@` forwards depending on Squarespace forwarding.

## Out of scope for v1

Admin authentication and sessions (modelled when Phase 2 starts), audio uploads (Phase 3), public accounts and comments (Phase 4), a native mobile app.
