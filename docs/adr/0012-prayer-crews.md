# 0012. Prayer crews and public accounts

Status: proposed 2026-11-22. Hendrik is investigating; no date is set and nothing is built. The design and open points are in [prayer_crew.md](../prayer_crew.md). This ADR becomes **accepted** when Hendrik approves the feature and the open points there are closed.

## Context
Until now the site has had no login: ADR 0003 says Phase 1 has no public login and keeps accounts for the Phase 2 admin area. Hendrik wants a private prayer feature for registered users: a user creates a **crew** (a small group of users), invites people, and each member writes prayer requests and chooses who in the crew sees each one. A person who is not yet on the site can be invited, register, and then accept or decline.

This adds public accounts, a new kind of very sensitive data (prayer requests reveal faith, health and family matters) and email addresses of people who are not yet our users (invitees). That changes the data model and the security posture, so it needs an ADR (CLAUDE.md section 14).

The separate public prayer request form (PLAN.md 1.4) is kept for visitors without a crew: its requests go to `prayer@wordonthewater.net` and general messages go to `hello@wordonthewater.net`. It is not changed by this decision.

## Decision
- **Public accounts exist, only for the crew feature.** Reading, the Bible reader, devotionals and Ask the Word stay open to everyone. Prayer is visible only after sign-in.
- **Passwordless sign-in, two ways, one at a time:** an email magic link (single use, 15 minutes, tokens stored as hashes) for the first release, and Google sign-in as a later change (decided 2026-11-22). Both end in one account matched on a **verified** email address. No passwords, no JWTs in `localStorage`.
- **Sessions** are opaque random ids in Postgres, sent in a `__Host-` cookie (`HttpOnly; Secure; SameSite=Lax; Path=/`), as in ADR 0003. The session cookie is strictly necessary and is named in the privacy policy.
- **An account is separate from the newsletter.** Creating one does not subscribe anyone to Kit.
- **Crews:** the creator is the owner; only the owner invites and removes. Limits: 5 crews per user, 12 members per crew, 10 pending invites per crew. A member can leave; the owner must hand over or delete the crew first.
- **Invites:** a single-use link that expires after 7 days, sent by email through us or copied and sent by the owner. A recipient who is not registered signs up first, then accepts or declines. An invitee's email address is kept only until the invite is closed or expires. Only signed-in, email-verified users can invite; invite emails are rate limited per user and per target address, one email per invite, no reminders.
- **Prayer requests** are stored in their own table (not the form's `prayer_requests` table), encrypted at the application layer with the scheme of ADR 0006 (AES-256-GCM, a `key_id` per row). Text is never logged, never sent to Sentry or analytics, never put in an email. **There is no admin or owner view of crew requests.** A request can be read only by its author and the recipients the author chose.
- **Sharing** is per person (decided 2026-11-22): the author picks individual members from every crew they belong to, so a request can reach people in different crews. One row per recipient in `prayer_shares (request_id, user_id)`. A share counts only while author and recipient still have at least one crew in common, checked on every read, so leaving a crew needs no cleanup job and never breaks a share that another common crew still supports.
- **Email** for sign-in links and invites goes through the existing `EmailProvider` and outbox using Postmark (ADR 0004), which therefore moves from "after launch" to a prerequisite of this feature. The free tier is the starting plan; upgrade when the monthly count nears the allowance.
- **Notifications:** none in version 1 beyond the sign-in and invite emails. Web Push ([ADR 0011](0011-web-push.md)) is the likely later route.
- **Every read goes through one service function** that checks authorship or a share row (default deny), with a test for the "someone else's request" case on each endpoint.

## Alternatives rejected
- **Passwords:** storage, breach and reset duties for a small site, and the weakest option for sensitive data.
- **Google sign-in only:** excludes people without a Google account and makes one company a hard dependency.
- **Reusing the form's `prayer_requests` table:** it was designed for a one-way message to the owner (optional email, `share_with_team`, `delete_after`); mixing two privacy models in one table invites a leak.
- **An admin view of crew requests (a prayer team):** useful for moderation but makes the site owner a reader of private prayer, which defeats the point. Abuse is handled by account deletion and a report path, not by reading content.
- **Any member can invite:** wider spread of the crew's circle and more invite spam risk; revisit if owners ask for it.
- **A third-party auth service (Auth0, Clerk, Supabase Auth):** another processor holding every user's email, and it conflicts with the free, minimal-data stance (ADR 0002 rejected Supabase for related reasons).

## Consequences
- **Largest change since launch.** Accounts are the bulk of the work and risk. Four slices, each its own PR: documents and decisions, accounts, crews and invites, requests and sharing.
- **Postmark must be set up first** (DNS for DKIM and the return path in Squarespace, a Sensitive server token). The domain's DMARC is `p=reject` with strict alignment, so unsigned mail would be rejected. Sign-in emails make deliverability a launch-quality concern for this feature.
- **New processors and data to disclose:** Postmark (sign-in and invite emails), Google (if Google sign-in is built), invitee email addresses, the session cookie, and crew prayer content (encrypted). `docs/privacy.md`, `src/content/privacy.ts` and the threat model get new sections; the threat model gains rows for account enumeration, invite spam, a leaked invite link, session theft and a leaked encryption key.
- **The encryption key becomes more critical.** Losing it loses every request, and a leak exposes them. Key backup and rotation are added to the rotate-secrets runbook; backups hold ciphertext only.
- **ADR 0003 is amended:** public accounts are no longer "if ever added in Phase 4". The Phase 2 admin login, when built, reuses these accounts and adds the second factor.
- **Account deletion is required** (GDPR and POPIA): it removes the user's requests, shares and memberships, and closes their pending invites.
- **Spec and plan documents** (CLAUDE.md, PLAN.md, post_launch.md, privacy.md, threat-model.md, the runbooks) are updated when the feature is accepted, not before.
