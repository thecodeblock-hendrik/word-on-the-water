# Prayer crew: build checklist

Design: [prayer_crew.md](prayer_crew.md), mockups: [design/prayer_crew_design.html](design/prayer_crew_design.html). Decision: [ADR 0012](adr/0012-prayer-crews.md). Status: **proposed, not started, no date** (2026-11-22). Do not start before Hendrik approves and the launch work in [production_checklist.md](production_checklist.md) is done.

## How to work through this list

- One branch and one PR per slice (names of 36 characters or fewer, for example `feat/crew-accounts`), a Conventional Commit per step, push once per slice (CLAUDE.md section 14).
- **Tests first**: show each test failing for the right reason before the code. Bug fixes come with a test.
- Small steps, validate each one. Run `make lint typecheck test` before every PR, `make e2e` for UI changes.
- Never log, send to Sentry or email any prayer text. Never commit secrets or real data; use fixtures.
- Migrations are backward compatible. A new migration is applied to `preview-base` first ([deploy.md](runbooks/deploy.md)).
- A flag `CREW_ENABLED` hides everything until the last slice is proven. Set it on the web and the API.
- Items marked **(Hendrik)** are dashboard or account steps only Hendrik can do.

## Slice 0. Decisions and prerequisites

- [x] 0.1 Design, ADR 0012 and the doc updates (2026-11-22).
- [ ] 0.2 **(Hendrik)** Approve the feature and set a start date.
- [ ] 0.3 **(Hendrik)** Postmark: create the account on the free tier, add `wordonthewater.net`, copy the DKIM TXT and the Return-Path CNAME into Squarespace DNS (host part only; never touch the Email Forwarding preset; one SPF record only, merge Postmark in), verify both. Steps in PLAN.md 1.4 "Postmark setup".
- [ ] 0.4 **(Hendrik)** Send a test to Gmail and check "Show original": SPF pass, DKIM `d=wordonthewater.net`, DMARC pass (strict `p=reject`). Check the inbox, not spam.
- [ ] 0.5 **(Hendrik)** Production variables on `wotw-api`: `EMAIL_PROVIDER=postmark`, `EMAIL_FROM`, `POSTMARK_SERVER_TOKEN` (Sensitive). Preview keeps Mailpit or a test inbox.
- [ ] 0.6 **(Hendrik)** Sign Postmark's DPA and save it with the others ([privacy.md](privacy.md)).
- [ ] 0.7 Generate `PRAYER_ENCRYPTION_KEY` (32 random bytes) per environment; set as a Sensitive variable on the API only; keep an offline copy in the password manager (losing it loses every request). Different keys for Preview and Production.
- [ ] 0.8 Add the flag `CREW_ENABLED` to `env.ts` (web) and the API settings, off by default.
- [ ] 0.8a **(Hendrik)** Create `support@wordonthewater.net` (a Squarespace email forward to your mailbox, like `hello@`; leave the MX records alone) and test that it arrives. Used by "Report a problem".
- [ ] 0.9 Decide the first-release limits as constants in one module: 5 crews per user, 12 members per crew, 10 pending invites per crew, invite life 7 days, link life 15 minutes, session 30 days.

## Slice A. Accounts (magic link)

Branch `feat/crew-accounts`. The riskiest slice: take it slowly.

### A1. Encryption
- [ ] A1.1 Test then build `app/core/crypto.py`: AES-256-GCM, a random nonce per value, `key_id` stored beside the ciphertext, several keys loadable so rotation works (ADR 0006).
- [ ] A1.2 Tests: round trip, tamper detection (a changed byte fails), wrong key fails, a new key id decrypts old rows.

### A2. Tables and models
- [ ] A2.1 Alembic migration (as `app_migrator`, backward compatible): `users` (id, email citext unique, first_name, created_at, last_seen_at), `sessions` (opaque id hash, user_id, expires_at, last_used_at), `login_tokens` (token hash, email citext, expires_at, used_at).
- [ ] A2.2 Grant `app_runtime` DML only. Models in `app/models/`, registered in `models/__init__.py`.
- [ ] A2.3 Apply to `preview-base` first. **(Hendrik)** for production, apply then promote ([deploy.md](runbooks/deploy.md)).

### A3. Services and endpoints (API)
- [ ] A3.1 Test then build `services/auth.py`: request a link (always the same answer, whether or not the address exists), verify a token (single use, 15 minutes, constant-time compare on the hash), create or find the user by verified email, create a session, sign out, delete expired rows.
- [ ] A3.2 `POST /v1/auth/link` (always 202): Pydantic `extra="forbid"`, honeypot, minimum time, Turnstile, rate limit per hashed IP and per address, idempotency key.
- [ ] A3.3 `POST /v1/auth/verify` (token or code), `POST /v1/auth/signout`, `GET /v1/auth/me`.
- [ ] A3.4 A `current_user` dependency: reads the session, default deny on every crew route, a new session id on sign-in, last-used touched at most once a day.
- [ ] A3.5 Sign-in email template (text and HTML, no prayer data) through the outbox; the link and a six-character code as a fallback.
- [ ] A3.6 Tests: expired, reused and unknown tokens; replay; enumeration (identical responses and timing class); rate limits; session expiry; fixation.
- [ ] A3.7 Retention job: delete expired sessions and used or expired login tokens. Test.
- [ ] A3.8 Regenerate API types (`make types`).

### A4. Web
- [ ] A4.1 Session cookie: `__Host-` name, `HttpOnly; Secure; SameSite=Lax; Path=/`, set by a Server Action after verify, cleared on sign out (unit tested).
- [ ] A4.2 Pages `/signin` (email, first name on first sign-in, Turnstile, a plain "check your email" state, no hint whether the address was known) and `/signin/verify` (link and code). Mobile first at 375px, visible labels, `aria-live` errors, works without JavaScript.
- [ ] A4.3 Account menu: after sign-in the header drop-down and the mobile menu show **Prayer** and **Sign out**; signed out visitors see no Prayer entry. Behind `CREW_ENABLED`. (A signed-in navigation of its own is a later decision.)
- [ ] A4.4 Account page: first name edit, sign out, **delete account** (confirm step).
- [ ] A4.5 Account deletion in the API: one service removes sessions, login tokens, memberships, invites, requests and shares (grows as later slices add tables; keep a test that fails when a new table is not covered).
- [ ] A4.6 Check the CSP, the landing JS budget (165 KB gz; the auth code loads only on its own routes) and Lighthouse.
- [ ] A4.7 E2E (iPhone SE, iPhone 13, Pixel 7, desktop): request a link against a stub or Mailpit, sign in, see the menu, sign out. axe: no serious problems.

### A5. Docs and PR
- [ ] A5.1 Threat model rows PC4, PC5, PC6, PC9, PC11, PC12 marked Done with their tests.
- [ ] A5.2 Update the runbooks (sign everyone out: delete `sessions`) and `.env.example`.
- [ ] A5.3 Tick this list, `make lint typecheck test e2e`, PR, wait for CI, merge, then promote by hand **(Hendrik)** with `CREW_ENABLED` still off in Production.

## Slice B. Crews and invites

Branch `feat/crew-invites`.

### B1. Tables
- [ ] B1.1 Test, then migration: `crews` (id, name, owner_id, created_at), `crew_members` (crew_id, user_id, role owner|member, joined_at, primary key crew_id + user_id), `crew_invites` (id, crew_id, invited_by, token_hash, email citext null, status pending|accepted|declined|revoked|expired, expires_at, created_at). Preview-base first.

### B2. Services
- [ ] B2.1 Create a crew (name 1 to 80 characters, limit 5 crews per user); the creator becomes owner.
- [ ] B2.2 Create an invite (owner only; verified user; 10 pending per crew; single use; 7 days). Returns the link; optionally queues one email through the outbox to a given address (rate limits per user and per target address; no reminders; the email names the crew and the inviter's first name and nothing else).
- [ ] B2.3 Show an invite by token: crew name and inviter's first name only, to the holder of the link. Unknown, used or expired tokens give one generic answer.
- [ ] B2.4 Accept (signed in; crew full check at 12; becomes a member; invite closed) and decline (invite closed; the owner only sees it is no longer pending).
- [ ] B2.5 A person who is not registered: the link goes to sign-in, then back to the invite. Keep the invite token through sign-in without putting it in logs.
- [ ] B2.6 Leave (member). Owner leaves: must hand over to another member or delete the crew; an empty crew is deleted.
- [ ] B2.7 Remove a member (owner only). Revoke an invite (owner only). Delete a crew (owner only).
- [ ] B2.8 Retention: delete closed or expired invites and their invitee addresses; test.
- [ ] B2.9 Tests for each rule, including: non-owner cannot invite, remove or delete; a stranger cannot list members; limits; double accept; expired link; accepting twice as two users.

### B3. Endpoints
- [ ] B3.1 `GET/POST /v1/crews`, `GET /v1/crews/{id}` (members visible to members only), `DELETE`, `POST /v1/crews/{id}/leave`, `DELETE /v1/crews/{id}/members/{user}`.
- [ ] B3.2 `POST /v1/crews/{id}/invites`, `DELETE` (revoke), `GET /v1/invites/{token}`, `POST /v1/invites/{token}/accept`, `POST /v1/invites/{token}/decline`, `GET /v1/me/invites` (invites for my verified address).
- [ ] B3.3 Pydantic schemas with limits and `extra="forbid"`, rate limits, default deny. Regenerate types.

### B4. Web
- [ ] B4.1 `/prayer` home (signed in only; redirect to sign-in otherwise): my crews, pending invites with Accept and Decline, a Create crew button. Empty state explains what a crew is in one sentence.
- [ ] B4.2 `/prayer/crews/[id]`: members, Invite (copy link, send by email), Leave, and for the owner Remove, Revoke, Delete.
- [ ] B4.3 `/invite/[token]` page for the invited person.
- [ ] B4.4 Mobile first at 375px, light and dark, 44px targets, confirm steps for Leave, Remove and Delete, keyboard and screen reader checked.
- [ ] B4.5 E2E: create a crew, invite by link, a second user accepts, a third declines, a member leaves, the owner removes a member. axe clean.
- [ ] B4.6 Threat model rows PC4, PC7, PC8 marked Done. Tick, PR, merge, promote **(Hendrik)** with the flag off.

## Slice C. Prayer requests and sharing

Branch `feat/crew-prayers`.

### C1. Tables
- [ ] C1.1 Test, then migration: `crew_prayers` (id, author_id, title null, body_ciphertext, key_id, status open|answered, created_at, updated_at), `prayer_shares` (request_id, user_id, read_at null, primary key request_id + user_id) and `prayer_taps` (request_id, user_id, created_at, primary key request_id + user_id). Not the form's `prayer_requests` table. Preview-base first.

### C2. Service (the access rule lives in one place)
- [ ] C2.1 Test first, then one `can_read(user, request)` rule: the author, or a share row **and** at least one crew in common with the author, checked on every read. No other code path reads a request.
- [ ] C2.2 Create (text 1 to 2,000 characters, optional title up to 80), edit, delete, mark answered or open, by the author only.
- [ ] C2.3 Set recipients: the author sends a list of user ids; each must share a crew with the author right now (reject others, same error as unknown). The list replaces the old one. An empty list is a private prayer.
- [ ] C2.4 List "my requests" and "shared with me" (newest first, author's first name, no other member data). Decrypt only for permitted readers.
- [ ] C2.4a "I prayed": a recipient adds or removes their own tap (only if they can read the request); the author sees the count only, never who. Test that a count never leaks names and that a non-reader cannot tap.
- [ ] C2.4b Unread: mark a share read when its recipient opens it (`read_at`); count unread for the Prayer badge (menu, home, lists). Test that reading one request does not mark others and that the author never sees recipients' read state.
- [ ] C2.4c Report a problem: an endpoint that emails `support@` through the outbox with the crew name and request id (never prayer text), rate limited, signed-in only.
- [ ] C2.5 Account deletion and leaving a crew: confirm no code is needed to clean shares (the read-time rule handles it); test that a removed member loses sight immediately, and keeps sight when another crew in common remains.
- [ ] C2.6 Tests: someone else's request on every endpoint (read, edit, delete, share, mark answered) returns the same not-found answer; tamper with a row and the read fails; no prayer text in logs or Sentry (log-capture test, as I1).

### C3. Endpoints
- [ ] C3.1 `GET/POST /v1/crew-prayers`, `GET/PATCH/DELETE /v1/crew-prayers/{id}`, `PUT /v1/crew-prayers/{id}/recipients`, `GET /v1/crew-prayers/shared`.
- [ ] C3.2 `GET /v1/me/people` for the picker: the members of every crew I belong to, each person once, with the crews they share with me. Rate limits, `Cache-Control: no-store`. Regenerate types.

### C4. Web
- [ ] C4.1 My requests and Shared with me lists on `/prayer`; a request page.
- [ ] C4.2 The write and edit screen: text with a live counter, a people picker grouped by crew with an "Everyone in <crew>" shortcut, a person who is in two crews listed once, nobody ticked when it opens (decided), the button reads Save privately until someone is ticked. Light and dark at 375px with the keyboard open.
- [ ] C4.2a The badge: "N new" on Prayer in the menu (mobile and drop-down), on Prayer home and the lists, with an unread dot per request. Counts come from one API call; no polling in the background (fetched when a page opens).
- [ ] C4.2b "I prayed" button and count on a request; a Report a problem link on requests and crews.
- [ ] C4.3 Mark answered, edit, delete (confirm). A plain note that the request is private and who can see it.
- [ ] C4.4 Prayer text only in server components or authenticated fetches; no caching of these pages (`no-store`); nothing in the page title or metadata.
- [ ] C4.5 E2E across two crews: A in crews 1 and 2 shares with B (crew 1) and C (crew 2); D (crew 1 only) sees nothing; B leaves crew 1 and loses sight; delete removes it for everyone. axe clean.
- [ ] C4.6 Threat model rows PC1, PC2, PC3, PC10 marked Done. Tick, PR, merge, promote **(Hendrik)** with the flag off.

## Slice D. Compliance, docs, launch of the feature

Branch `docs/crew-launch`.

- [ ] D1. Privacy policy text in `src/content/privacy.ts` from the "Prayer crew" section in [privacy.md](privacy.md): accounts, the session cookie, crews, invitee addresses, requests, Postmark; consent wording and version bump. `pnpm check:placeholders` clean.
- [ ] D2. Retention table in privacy.md is final and enforced by the job (sessions, login tokens, closed invites).
- [ ] D3. Rotate-secrets runbook: test a key rotation on a copy (new key id, old rows still readable). Incident runbook: how to sign everyone out and what to tell crew members after an exposure.
- [ ] D4. Restore test: restore a dump and check the crew tables and that erased accounts are erased again ([restore-db.md](runbooks/restore-db.md)).
- [ ] D5. Vercel Firewall rate-limit rules for `/v1/auth/*` and the invite routes **(Hendrik)** (Log first, then 429, as for sign-up and chat).
- [ ] D6. Sentry check **(Hendrik)**: sign in, create a request and a crew, then read the events in both projects and confirm no address or prayer text.
- [ ] D7. VoiceOver and TalkBack pass on sign-in, crew, invite and request screens **(Hendrik)**.
- [ ] D8. Neon DPA e-signature decision ([post_launch.md](post_launch.md)); Postmark DPA saved.
- [ ] D9. Lighthouse and the landing JS budget still pass with the flag on.
- [ ] D10. ADR 0012 status: proposed to accepted. ADR 0003 amendment confirmed. CLAUDE.md status bullet and PLAN.md 1.12 ticked.
- [ ] D11. Switch `CREW_ENABLED` on in Preview first, walk the whole journey with two or three real people, then in Production **(Hendrik)**.
- [ ] D12. Watch Postmark's monthly count; upgrade the plan before the free allowance runs out.

## Later (not in this checklist)

Google sign-in (own slice, after the magic link has run for a while), "I prayed" taps, notifications (Web Push, [web_push.md](web_push.md)), a signed-in navigation, auto-delete of answered requests, passkeys, the public prayer form and the contact form (PLAN.md 1.4 and 1.5).
