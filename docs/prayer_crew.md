# Prayer crew

Status: investigating (2026-11-22, branch `prayer_crew`). Nothing is built and no date is set. Decisions so far are in "Decisions" below; only this file and [ADR 0012](adr/0012-prayer-crews.md) are written. The other documents are updated when the feature is approved.

The old public prayer request form (PLAN.md 1.4) **stays** as a separate, later feature: it is for visitors without a crew. Prayer requests from the form go to `prayer@wordonthewater.net` and general messages go to `hello@wordonthewater.net`. The crew feature does not replace it.

## The idea

Prayer is private and only for registered users. A user creates a **crew** (a small group of users), invites people, and each member writes prayer requests and chooses which crew members see each one.

- Create a crew, invite people, accept or decline an invite, leave a crew.
- A request belongs to its author. The author picks who in the crew sees it, per request.
- A person without an account gets an invite, registers, and then joins.
- Kept simple for now (see "Version 1" and "Not in version 1").

## Advice in short

1. **The crew is the easy part. Accounts are the hard part.** The site has had no login by design (CLAUDE.md 6.5 puts accounts in Phase 2, for admins). This feature pulls sign-in forward, for the public. That is the bulk of the work and the bulk of the risk.
2. **Do it after launch (28 November).** It needs a new area of the site, a new data model, a transactional email provider (Postmark, still unset up) and a privacy rewrite. It should not touch launch week.
3. **Use passwordless sign-in: an email magic link and Google sign-in (decided).** No passwords to store, leak or reset. The magic link uses the Postmark email path we need anyway for invites. Passkeys can be added later.
4. **Make crew prayer content unreadable to us.** Crew requests are encrypted in the database (ADR 0006), and there is no admin view of them. Not even the site owner reads them. This is a deliberate simplification: it removes the need for a crew-side admin inbox and most of the audit-log work. The separate public form (requests to `prayer@`) is unaffected, since the person sends that to you on purpose.
5. **Keep Ask the Word, devotionals and the Bible open to everyone.** Only the crew area needs an account.

## Complexity

Overall: **large for this project, the biggest feature since launch**, but each slice is ordinary. It is mostly new surface area (auth, email, privacy), not hard logic.

| Slice | What | Size |
|---|---|---|
| A. Accounts | Magic-link sign-in, sessions, sign out, account page, delete account | Large (the riskiest slice) |
| B. Crews and invites | Create, invite by link or email, accept, decline, leave, remove, owner rules | Medium |
| C. Requests and sharing | Create, edit, delete, mark answered, share with chosen members, encrypted | Medium |
| D. Compliance and docs | Privacy policy, threat model, ADRs, retention, account deletion, runbooks | Medium |

Suggested order (magic link only first; Google is a later slice): D (decisions and docs first), A, B, C. Each is its own PR, tests first, one branch per slice (names 36 characters or fewer).

## How it would work

### Accounts

- **Two ways in, both optional:** an email magic link, and "Continue with Google" (see "Google sign-in" below). Both end in the same account, matched by verified email address.
- Magic link: we send a one-time link (and a short code as a fallback for phones that open links in the wrong browser). The link works once and expires in 15 minutes.
- Session: an opaque random ID stored in Postgres, sent as a `__Host-` cookie (`HttpOnly; Secure; SameSite=Lax`), as CLAUDE.md 6.5 already specifies. Idle timeout 30 days for readers (admin's 30 minutes is for Phase 2 admin only).
- Sign-in is a Server Action calling the API, like sign-up today. Turnstile and rate limits (per hashed IP and per email) on the send-link step.
- Same response whether or not the address already has an account (no enumeration).
- The account is separate from the newsletter. Creating an account does **not** subscribe anyone to Kit; that stays an explicit choice with its own double opt-in.
- A user can delete their account: their requests, shares and memberships are removed.

### Crews

- A user can create a crew (name only). Suggested limits: 5 crews per user, 12 members per crew. Small limits keep it a prayer circle, not a social network, and limit abuse.
- The creator is the **owner**. Everyone else is a **member**.
- **Invite**: only the owner creates an invite (decided). It is a single-use link that expires after 7 days. They can either send it by email through us, or copy the link and send it themselves (WhatsApp is likely how most people will do it).
- **Person already registered:** they see the invite in the crew area after signing in, and can accept or decline.
- **Person not registered:** the link takes them to sign-up. After they confirm their email, the invite is shown and they accept or decline.
- **Decline:** the invite is closed. The owner is told only that it is not pending anymore, nothing that pressures the person.
- **Leave:** a member can leave at any time. Their requests stay theirs. What was shared between them and people they no longer share a crew with stops being visible, in both directions.
- **Remove a member:** owner only.
- **Owner leaves:** must hand the crew to another member first, or delete the crew. A crew with no members is deleted.

### Prayer requests and sharing

- A request is free text (limit 2,000 characters, as already planned), an optional title, an author, a created date and a status: `open` or `answered`.
- When writing or editing, the author picks individual members from a list grouped by crew, with an "Everyone in <crew>" shortcut for each crew, or nobody (a private prayer list).
- **Several crews:** the list holds the members of every crew the author belongs to, so one request can go to people in different crews. A person who is in two of the author's crews is listed once and sees the request once.
- **The rule that keeps it safe:** a share only counts while the author and the recipient still have at least one crew in common. It is checked every time the request is read (no cleanup job). If the recipient leaves or is removed from the last crew they share with the author, the request disappears for them; if they still share another crew, it stays.
- Members see requests shared with them, newest first, with the author's first name.
- The author can edit, un-share, mark as answered or delete at any time. Deleting removes it for everyone at once.
- No comments and no reactions in version 1 (see below).

## Data model (sketch)

All ids UUID, all times timestamptz UTC, as in CLAUDE.md 7.

```
users                 id, email citext unique, display_name varchar(80), created_at, last_seen_at, deleted_at
sessions              id (opaque), user_id, expires_at, created_at
login_tokens          token_hash, email citext, expires_at, used_at          -- magic links, single use
crews                 id, name varchar(80), owner_id, created_at
crew_members          crew_id, user_id, role enum(owner, member), joined_at   -- primary key (crew_id, user_id)
crew_invites          id, crew_id, invited_by, token_hash, email citext null, status enum(pending, accepted, declined, revoked, expired), expires_at
prayer_requests       id, author_id, title null, body_ciphertext, key_id, status enum(open, answered), created_at, updated_at
prayer_shares         request_id, user_id (recipient)                         -- primary key (request_id, user_id)
```

- The existing `prayer_requests` table (built for the public form: first name, optional email, `share_with_team`, `delete_after`) stays for the form. The crew's requests go in a new table so the two never mix (shown above as `prayer_requests`, to be named `crew_prayers` when built). The encryption code in ADR 0006 (AES-256-GCM, `key_id` per row) is shared by both.
- Magic-link tokens and invite tokens are stored as hashes only.
- Every query for requests goes through one service function that joins on `prayer_shares` or the author, so a missing check cannot leak a request (default deny, as for all `/v1` routes).

## Security and privacy

This is the highest-sensitivity data on the site (faith, health, family). The rules, most of which already exist in CLAUDE.md 6:

- Request text is encrypted at the application layer, never logged, never sent to Sentry, analytics or any third party, never in an email. Notification and invite emails never contain prayer text.
- Authorisation on every read and write: you see a request only if you are the author or a recipient. Tests for the "someone else's request" cases, per endpoint.
- Invites expose nothing about the crew to a stranger beyond its name and the inviter's first name, and only to the holder of the link.
- Invite abuse: only signed-in, email-verified users can invite; at most 10 pending invites per crew; invite emails rate limited per user and per target address; one email per invite, no reminder emails.
- We store the invited email address of a person who is not our user. Treat it as personal data: kept only until the invite expires or is closed, then deleted by the retention job, and named in the privacy policy.
- Retention: requests are deleted on the author's request or account deletion; answered requests can optionally auto-delete after a period the author picks (a later option; version 1 keeps them until deleted). Sessions and login tokens expire and are cleaned by the retention job.
- The privacy policy, `docs/privacy.md` and the threat model need new sections (accounts, crews, prayer content, invited emails, the session cookie, processors: Postmark).
- Postgres backups contain ciphertext only. The encryption key stays in Vercel Sensitive variables; losing it loses all requests, so key backup and rotation go into the rotate-secrets runbook.

## Not in version 1 (kept out on purpose)

- Notifications of any kind beyond the invite email and the sign-in email. Without them a crew can go quiet; the later fix is the planned Web Push ([web_push.md](web_push.md)), or one optional weekly email. Version 1 relies on the member opening the app.
- Comments, replies, reactions. A single "I prayed" tap is the likely first addition because it is small and encouraging.
- Public prayer requests shown to other visitors. (The separate form that emails `prayer@` is kept for later, see the top of this file.)
- Admin or moderation view of requests. The owner of the site cannot read them.
- Passwords, social login, passkeys.
- Native app, file or photo attachments, search, crew chat.

## What changes in the existing documentation

When this is agreed, one PR on this branch updates:

- **CLAUDE.md:** section 1 item 3 (add the prayer crew next to the form, and accounts are in scope), 6.1 data table (crew prayer requests row), 6.5 (public accounts now exist; remove "Phase 1 has no public login"), 6.6 (prayer email rules), 7 data model (the form's `prayer_requests` table and the crew's requests must not be confused; name the crew table `crew_prayers`), 8 endpoints, 13 phases (accounts pulled out of Phase 2 admin), the decision log, and section 15 question 4 and 5.
- **PLAN.md:** keep step 1.4 (the form, to `prayer@`), add a new step for the crew with the slices above, and adjust the Phase 2 login and RBAC lines (admin login still comes later and reuses the public accounts; the `prayer_team` role stays for the form's inbox).
- **post_launch.md, production_checklist.md:** where they mention the prayer form, `prayer@`, `PRAYER_INBOX`.
- **privacy.md** and, when built, `src/content/privacy.ts`.
- **threat-model.md:** new assets, entry points, abuse cases (invite spam, enumeration, session theft, a leaked invite link).
- **ADR 0003 (auth approach):** amend or supersede for public accounts. **ADR 0006:** keep, note the new table. **New ADR 0012:** prayer crews (decision, alternatives, consequences).
- **Runbooks:** incident (a breach now means prayer data), restore-db, rotate-secrets (the encryption key).
- **Code:** `apps/api/app/models/prayer_request.py` and `jobs/retention.py` stay for the form; the crew adds its own models.
- **Navigation:** Prayer shows only after sign-in, first as an entry in the menu (a drop-down on desktop, the menu on phones). The phone bottom bar ([landing_page_nav.md](landing_page_nav.md)) is unchanged for now; a dedicated navigation for signed-in users can be designed later.

## Decisions (2026-11-22)

| # | Decision |
|---|---|
| 1 | Keep the public form. Prayer requests from it go to `prayer@wordonthewater.net`, general messages to `hello@wordonthewater.net`. |
| 2 | Invites by link and by email. |
| 3 | Only the crew owner invites. |
| 4 | Option B: the author picks individual members, and can share across every crew they belong to. |
| 5 | Prayer is visible only after sign-in, in the menu first. A signed-in navigation is for later. |
| 6 | Magic link only for the first release. Google sign-in comes later. |
| 7 | First name only. |
| 8 | No date. Investigating only. Start Postmark on the free tier and upgrade if needed. |

## Who sees a request (decided: Option B)

Each request has an author and a list of people who can see it. Two ways to choose that list:

- **Option A, whole crew or only me.** When you write a request there is one switch: "Share with my crew" on or off. Everyone in the crew sees it, or nobody does. If you are in two crews you pick which crew. Simplest screen, least to explain, and it cannot go wrong by ticking the wrong person.
- **Option B, chosen members.** The same screen has a list of your crew's members with a tick box each, and "Everyone" ticked by default. You can share a sensitive request with just two people (for example a spouse and a pastor) and keep it from the rest.

Example: you ask for prayer about a health scare. With A you must show it to the whole crew of 12 or keep it to yourself. With B you can show it to three close friends.

The data model is the same either way (the `prayer_shares` table already holds one row per recipient), so B can be added later without a migration. What B adds is screen work, tests, and one rule: when someone leaves or is removed from a crew, their shares in that crew are deleted.

Your original description ("they decide who to share that prayer request with in their crew") is Option B. My recommendation is B, with "Everyone" ticked by default, because for faith and health topics the privacy choice is the reason the feature exists; but A is a smaller first release. **Decided 2026-11-22: Option B.**

## Google sign-in

What it is: a "Continue with Google" button. The visitor signs in at Google and Google tells us their verified email address and first name. We never see a Google password.

- **Good:** one tap on a phone that is already signed in to Google; no email to wait for; works even where our emails land in spam.
- **Cost:** a Google Cloud project with an OAuth consent screen (Google reviews it for public apps), a client id and secret kept as Sensitive variables, and Google becomes a processor that learns the person signs in to Word on the Water (the privacy policy must say so). Sign-in would be a normal link out and back (the CSP `form-action 'self'` blocks a form that redirects to Google, so it must be a link, not a form post).
- **Account matching:** Google and the magic link meet on the verified email address, so the same person gets one account either way. Never match on an unverified address.
- **Suggested order (magic link only first; Google is a later slice):** the magic link first (it is needed for invites anyway), Google as a separate later PR. Both are in scope.

## Postmark: what it is and how it works

**What.** Postmark is a service that sends email for an application, the kind triggered by an action (a sign-in link, an invite, a notification) rather than a newsletter. Kit sends our newsletter and sign-up confirmation, but Kit has no way to send a one-off message to one person from code, so a second service is needed (ADR 0004).

**How it works.**
1. Our API makes one HTTPS call to Postmark with the recipient, subject, text and HTML body, using a secret server token.
2. Postmark sends the message from its own mail servers, signed with a DKIM key for `wordonthewater.net`, so receiving mail servers accept it as coming from us.
3. Postmark reports the result: delivered, bounced or marked as spam. It can call a webhook to tell us, and its dashboard shows each message.
4. It has separate "message streams" (transactional vs broadcast) so one kind of mail never harms the reputation of the other. We would use only the transactional stream.

**What we already have.** An `EmailProvider` interface with Postmark, SMTP and console versions, the retrying email outbox, and the drain cron job. Nothing real has been sent yet: locally mail goes to Mailpit.

**What is left to do (from PLAN.md 1.4, "Postmark setup").** Create the account, add `wordonthewater.net`, copy two DNS records (a DKIM TXT and a return-path CNAME) into Squarespace DNS, verify them, set the server token as a Sensitive variable, and send a test to Gmail to check SPF, DKIM and DMARC pass. This matters because the domain publishes DMARC `p=reject` with strict alignment: until Postmark signs as `wordonthewater.net`, its mail would be rejected, not delivered.

**Cost and alternatives.** Postmark has a small free tier (about 100 emails a month, check the current figure) and then paid plans by volume, which would be a few dollars to about USD 15 a month at our sizes. Sign-in links, invites and form notifications are low volume. The provider is swappable behind `EmailProvider` (Resend and Amazon SES do the same job), so choosing it is not a lock-in. Postmark's reputation for fast, reliable delivery of sign-in emails is why it was assumed.

**Why it matters for this feature.** A magic link that arrives late or in spam is a failed sign-in, so deliverability is the one thing we cannot cut corners on. Google sign-in lessens that dependency but invites still need email (or a link the owner sends by WhatsApp).

## Cost of magic link only

- **Google:** nothing. Not built in the first release.
- **Postmark:** every sign-in link and every invite email is one message. The free tier (about 100 a month, check the current figure) covers roughly 100 sign-ins and invites a month. To stretch it, sessions last 30 days, so a person asks for a link about once a month, not every visit.
- **Rough sizing:** 30 active people signing in monthly plus a few invites is well inside the free tier. A few hundred active people would pass it and need the first paid plan (a few dollars to about USD 15 a month).
- **Neon, Upstash, Vercel:** the new tables and the extra requests fit the current plans at this size. No new service is needed.
- **Your time:** the real cost is DNS setup once and watching deliverability (a link in spam is a failed sign-in). A one-time code shown on the page ("or type this code") gives people a way in even when the link is clicked in the wrong browser.
- **Upgrade trigger:** Postmark's dashboard shows the monthly count; move to a paid plan before the free allowance runs out.

## Open questions

None at the moment. Next step when you say so: update CLAUDE.md, PLAN.md and the other documents listed above, then start slice A (accounts).
