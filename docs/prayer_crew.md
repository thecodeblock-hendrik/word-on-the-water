# Prayer crew

Status: **proposed** (2026-11-22; navigation and mockups redone 2026-11-28 for the liquid glass bar). Nothing is built and no date is set. Decisions are in "Decisions" below, and no questions are open. Related: [ADR 0012](adr/0012-prayer-crews.md), [prayer_crew_checklist.md](prayer_crew_checklist.md).

Mockups of the whole flow, on the live header and bottom bar: [design/prayer_crew_design.html](design/prayer_crew_design.html).

The old public prayer request form (PLAN.md 1.4) **stays** as a separate, later feature: it is for visitors without a crew. Prayer requests from the form go to `prayer@wordonthewater.net` and general messages go to `hello@wordonthewater.net`. The crew feature does not replace it.

## The idea

Prayer requests are private and only for registered users (everyone can see that the feature exists, see "Navigation"). A user creates a **crew** (a small group of users), invites people, and each member writes prayer requests and chooses which crew members see each one.

- Create a crew, invite people, accept or decline an invite, leave a crew.
- A request belongs to its author. The author picks who in the crew sees it, per request.
- A person without an account gets an invite, registers, and then joins.
- Kept simple for now (see "Version 1" and "Not in version 1").

## Advice in short

1. **The crew is the easy part. Accounts are the hard part.** The site has had no login by design (CLAUDE.md 6.5 puts accounts in Phase 2, for admins). This feature pulls sign-in forward, for the public. That is the bulk of the work and the bulk of the risk.
2. **Do it after launch (28 November).** It needs a new area of the site, a new data model, a transactional email provider (Postmark, still unset up) and a privacy rewrite. It should not touch launch week.
3. **Use passwordless sign-in: an email magic link first, Google sign-in later (decided).** No passwords to store, leak or reset. The magic link uses the Postmark email path we need anyway for invites. Passkeys can be added later.
4. **Keep crew prayer content closed to us.** Crew requests are encrypted in the database (ADR 0006), and there is no admin view of them. This is not end-to-end encryption: the server holds the key, so someone who controls both the key and the database could read them. The site must never claim otherwise. This is a deliberate simplification: it removes the need for a crew-side admin inbox and most of the audit-log work. The separate public form (requests to `prayer@`) is unaffected, since the person sends that to you on purpose.
5. **Keep Ask the Word, devotionals and the Bible open to everyone.** Only the crew area needs an account.

## Navigation (2026-11-28)

Built on the live header and liquid glass bar ([nav_new.md](nav_new.md)). All of it is behind `CREW_ENABLED`: with the flag off, nothing changes and Prayer appears nowhere.

**Decided:**
- The site bar has four tabs, each sized to its words (decision 21), for **every** visitor: Devotional, Bible, **Prayer** (praying hands icon), Ask the Word.
- A signed-out visitor who opens Prayer gets a public welcome page that explains crews, with one button, **Sign in or create an account**. It is not a form straight away.
- The hamburger menu and the desktop header have a Prayer link after Bible.
  - **Since 28 November the videos also add a link there** (Videos, after Bible, while `VIDEOS_ENABLED` is on; merged, not released). The order of Prayer and Videos is not decided.
- The chat bar and the Bible reader bar do not change. From the reader, Prayer is in the header menu. From the chat it is one step further: Shore, then Prayer.

**Also in the mockups.** Shore on Prayer pages is decided (22). The other rows are proposals:

| Choice | Detail |
|---|---|
| Shore on Prayer pages | On `/prayer` and below, Shore takes the Prayer tab's place, as it takes Devotional's on a devotional page. Back links in the page lead up inside Prayer. **Decided.** There is no Prayer tab or badge in the bar while inside Prayer; check it on a real phone |
| No bar while writing | Write, choose people and edit have their main button at the bottom and no bar. Elsewhere the bar hides with the keyboard, as in the chat |
| Badge | Unread requests plus waiting invites, signed in only, "9+" above nine, part of the tab's name ("Prayer, 2 new"). Also on the menu and header links. Fetched when a page is shown and refreshed after an action; no polling |
| No account button in the header | **Account** and **Sign out** are in the phone menu; Account is also on Prayer home (and holds Sign out) |
| Sign out on all devices | A button on the account page that ends every session |

**Measured on the live site (28 November, Chromium, with a copied tab or link added in the test browser):**
- **Equal tabs do not work:** "Ask the Word" (69.8px) has 6.7px each side at 375px while "Bible" has 28px, and at 320px it fills its 69.5px tab (1.3px each side even with 10px margins).
- **Decided: tabs sized to their words** (`flex: 1 1 auto`), so every label has the same space each side, with 16px margins at every width. In Chromium and WebKit: 11.4px at 320px, 16.4px at 360px, 18.3px at 375px, 25.2px at 430px. The narrowest tab is Bible, 49.5px at 320px. A "9+" badge reaches up to 4.5px past its tab and stays about 29px clear of the next icon.
- **The cost:** icons are not evenly spaced, and swapping a label moves them. On a devotional page (Shore for Devotional) icons move 3 to 15px compared with the landing page; on Prayer pages (Shore for Prayer) by 1.2px at most. Not yet tried: the moving pill and hold and slide, larger text settings, and real phones.
- Only the four-tab site bar changes. The chat bar, the reader bar and the bar with `CREW_ENABLED` off keep equal tabs.
- Header: a Prayer link fits in one row at 1024px. A Prayer link **plus** an account button is 32px too wide at 1024px, and makes the row taller at 1280px. The link with its badge still has to be measured.
- Header with videos on: measured on 28 November on the live site, with copied links, a Videos link **and** a Prayer link make the page 29px too wide at 1024px and the row taller at 1280px. With "About" removed both fitted (without Prayer's badge). Removing "About" is a proposal, to decide before the header links are built ([bibleproject.md](bibleproject.md), "Desktop header").

**Routes:** `/prayer` (welcome when signed out, home when signed in), `/signin`, `/signin/verify`, `/invite/[token]`, `/prayer/requests` and `/prayer/requests/[id]`, `/prayer/crews/[id]`, `/prayer/account`. Only the welcome page is meant to be indexed.

## Complexity

Overall: **large for this project, the biggest feature since launch**, but each slice is ordinary. It is mostly new surface area (auth, email, privacy), not hard logic.

| Slice | What | Size |
|---|---|---|
| A. Accounts | Magic-link sign-in, sessions, sign out, account page, delete account | Large (the riskiest slice) |
| B. Crews and invites | Create, invite by link or email, accept, decline, leave, remove, owner rules | Medium |
| C. Requests and sharing | Create, edit, delete, mark answered, share with chosen members, encrypted | Medium |
| D. Compliance and docs | Privacy policy, threat model, ADRs, retention, account deletion, runbooks | Medium |

Suggested order: decisions and documents first (done), then A, B and C, then D to launch. Google is a later slice. Each is its own PR, tests first, one branch per slice (names 36 characters or fewer).

## How it would work

### Accounts

- **One way in for the first release:** an email magic link. "Continue with Google" comes later (see "Google sign-in" below) and will end in the same account, matched by verified email address.
- Magic link: we send a one-time link, with a **6-digit code** as a fallback for phones that open links in the wrong browser. Both expire in 15 minutes, and using either ends both.
- Opening the link changes nothing: it shows a page with a **Sign in** button, and only that button uses the link up. Email security scanners open links, and would otherwise use them first.
- The code is short, so it works only in the browser that asked for it, and after 5 wrong tries the code and link stop working. It is typed into one box (`inputmode="numeric"`, `autocomplete="one-time-code"`), so paste and autofill work.
- Turnstile needs JavaScript, as on newsletter sign-up today, so requesting a link needs JavaScript.
- Session: an opaque random ID stored in Postgres, sent as a `__Host-` cookie (`HttpOnly; Secure; SameSite=Lax`), as CLAUDE.md 6.5 already specifies. Idle timeout 30 days for readers (admin's 30 minutes is for Phase 2 admin only), and every session ends 90 days after sign-in, used or not.
- **18 and over only.** The sign-in form says so, and a new account is created only when the person ticks "I am 18 or older" beside their first name (the box starts unticked). The time of that confirmation is stored. It is the person's own statement, not proof of age. If we learn an account belongs to someone younger, we delete it. The privacy policy states the age; have someone qualified confirm the wording.
- Sign-in is a Server Action calling the API, like sign-up today. Turnstile and rate limits (per hashed IP and per email) on the send-link step.
- Same response whether or not the address already has an account (no enumeration).
- The account is separate from the newsletter. Creating an account does **not** subscribe anyone to Kit; that stays an explicit choice with its own double opt-in.
- A user can delete their account: their requests, shares, memberships and invites are removed. Crews they own are handed over or deleted first.
- After sign-in the person returns to the Prayer page or invite they came from. Only addresses on our own site are accepted, so the sign-in cannot be used to redirect elsewhere.

### Crews

- A user can create a crew (name only). Suggested limits: 5 crews per user, 12 members per crew. Small limits keep it a prayer circle, not a social network, and limit abuse.
- The creator is the **owner**. Everyone else is a **member**.
- **Invite**: only the owner creates an invite (decided). It is a single-use link that expires after 7 days. They can either send it by email through us, or create a link and send it themselves (WhatsApp is likely how most people will do it). Only a hash is stored, so a link is shown once; a lost one is cancelled and replaced.
- **An emailed invite works only for that address:** only an account whose verified email matches it (ignoring capitals) can accept or decline. Another account is told to sign in with the invited address, which is never shown. A link the owner shares works for whoever uses it first.
- Opening an invite changes nothing: accepting or declining is a button press. Before that it shows only the crew name and the inviter's first name (no member count), and an invalid link names nobody.
- **Crew full:** the invite stays open until it expires.
- **Person already registered:** they see the invite in the crew area after signing in, and can accept or decline.
- **Person not registered:** the link takes them to sign-up. After they confirm their email, the invite is shown and they accept or decline.
- **Decline:** the invite is closed. The owner is told only that it is not pending anymore, nothing that pressures the person.
- **Leave:** a member can leave at any time. Their requests stay theirs. What was shared between them and people they no longer share a crew with is deleted, in both directions (see "The rule that keeps it safe").
- **Remove a member:** owner only.
- **Owner leaves:** must hand the crew to another member first, or delete the crew. A crew with no members is deleted.

### Prayer requests and sharing

- A request is free text (limit 2,000 characters, as already planned), an optional title, an author, a created date and a status: `open` or `answered`.
- When writing or editing, the author picks individual members from a list grouped by crew, with an "Everyone in <crew>" shortcut for each crew, or nobody (a private prayer list). The picker opens with nobody ticked.
- "Everyone in <crew>" ticks the people in the crew **now**. People who join later do not see the request, and the picker says so.
- **Several crews:** the list holds the members of every crew the author belongs to, so one request can go to people in different crews. A person who is in two of the author's crews is listed once and sees the request once.
- **The rule that keeps it safe:** a share only counts while the author and the recipient still have at least one crew in common. It is checked every time the request is read. When two people stop sharing their last crew (leave, remove, delete a crew, delete an account), the shares between them, both ways, are **deleted in the same transaction**, with their "I prayed" taps on those requests. Joining a crew together again brings nothing back; the author shares again if they want to. While they still share another crew, nothing changes. The read-time check stays as a second safeguard, and no cleanup job is needed.
- Members see requests shared with them, newest first, with the author's first name.
- The author can edit, un-share, mark as answered or delete at any time. Deleting removes it for everyone at once.
- **"I prayed" (decided for version 1):** a reader taps once; the author sees a count, never names. One tap per person per request, and it can be undone.
- No read receipts: the author never learns who has opened a request.
- **"New" badge (decided for version 1):** Prayer in the bar, menu and header and the lists show what is unread, because there are no notifications. A request counts as read when the person opens it.
- **Report a problem (decided):** a link on a crew and on a request that emails `support@wordonthewater.net` with the crew name and request id, never the prayer text. The owner of the site can remove an account; there is no screen for reading prayers.
- No comments and no other reactions in version 1 (see below).

## Screens and behaviour

Numbers are the sections of the [mockups](design/prayer_crew_design.html). Every screen has the site header and its menu; "back" links inside the page lead up within Prayer.

| Mockup | Screens | Behaviour |
|---|---|---|
| 1, 2 | Bar, menus, desktop header | See "Navigation" |
| 3 | Welcome, sign in, link and code, first name with age, link and session problems | One flow for new and returning people. One message for every kind of dead link |
| 4 | Prayer home: first visit, invite waiting, every day | One main action. A waiting invite is at the top. With no crew, a private prayer can still be written |
| 5 | Create, invite, share a link, owner's view, member's view | The owner's actions are named buttons (Remove, Cancel, Rename, Delete crew), not hidden behind a menu. Share uses the phone's share menu, with Copy where there is none |
| 6 | Invite email, signed out, accept or decline, not valid, full, wrong account | See "Crews" |
| 7 | Write, choose people, saved | Two steps with the main button at the bottom. "Save, only for me" until someone is ticked, then "Share with N people". Saving opens the request with a status message, with no separate success page |
| 8 | Shared with me and Mine, reading, "I prayed", the author's controls, empty list | A shared request shows the crews the reader has in common with the writer. "I prayed" is a button that can be undone. The writer sees who **can** see a request, never who has read it |
| 9 | Leave, remove, owner leaves, delete a request, delete the account | A bottom sheet below `lg`, a dialog from `lg`, each saying what will happen. Focus starts on the safe choice; Escape or a tap outside cancels. Deleting the account needs the word DELETE typed. No Undo for a deleted request |
| 10 | Account, save failed, limit reached, cannot load | A failed save keeps the text on the page, never stored on the device, and leaving with unsaved text asks first. Errors show no technical detail |
| 11 | Night swell, tablet, desktop | Tablet: one column of at most 640px, with the bar 440px and centred. From `lg`: requests beside the crews, no bar |

All screens: controls at least 44px, inputs 16px or larger with visible labels, errors announced with `aria-live`, "new" never shown by colour alone, and the bar's reduced motion, reduced transparency, contrast and forced-colour rules.

## Data model (sketch)

All ids UUID, all times timestamptz UTC, as in CLAUDE.md 7.

```
users                 id, email citext unique, first_name varchar(80), adult_confirmed_at, created_at, last_seen_at
sessions              id_hash, user_id, expires_at, last_used_at, created_at
login_tokens          token_hash, code_hash, browser_hash, attempts, email citext, expires_at, used_at   -- single use
crews                 id, name varchar(80), owner_id, created_at
crew_members          crew_id, user_id, role enum(owner, member), joined_at   -- primary key (crew_id, user_id)
crew_invites          id, crew_id, invited_by, token_hash, email citext null, status enum(pending, accepted, declined, revoked, expired), expires_at
crew_prayers          id, author_id, title null, body_ciphertext, key_id, status enum(open, answered), created_at, updated_at
prayer_shares         request_id, user_id (recipient), read_at null          -- primary key (request_id, user_id); read_at drives the new badge
prayer_taps           request_id, user_id, created_at                        -- "I prayed", primary key (request_id, user_id)
```

- The existing `prayer_requests` table (built for the public form: first name, optional email, `share_with_team`, `delete_after`) stays for the form. The crew's requests go in a new table, `crew_prayers`, so the two never mix. The encryption code in ADR 0006 (AES-256-GCM, `key_id` per row) is shared by both.
- Session ids, magic-link tokens, codes and invite tokens are stored as hashes only. A 6-digit code is easy to guess from a plain hash, so it uses a keyed hash (HMAC with a server secret).
- Every query for requests goes through one service function that joins on `prayer_shares` or the author, so a missing check cannot leak a request (default deny, as for all `/v1` routes).

## Security and privacy

This is the highest-sensitivity data on the site (faith, health, family). The rules, most of which already exist in CLAUDE.md 6:

- Request text is encrypted at the application layer, never logged, never sent to Sentry, analytics or any third party, never in an email. Notification and invite emails never contain prayer text.
- Authorisation on every read and write: you see a request only if you are the author or a recipient. Tests for the "someone else's request" cases, per endpoint.
- Invites expose nothing about the crew to a stranger beyond its name and the inviter's first name, and only to the holder of the link.
- Invite abuse: only signed-in, email-verified users can invite; at most 10 pending invites per crew; invite emails rate limited per user and per target address; one email per invite, no reminder emails.
- We store the invited email address of a person who is not our user. Treat it as personal data: kept only until the invite expires or is closed, then deleted by the retention job, and named in the privacy policy.
- **Links that carry a secret** (sign-in and invite) must never reach our logs, Sentry, Vercel Web Analytics or Speed Insights. Both analytics scripts are in the root layout and record page addresses, and Vercel logs request paths. How to keep the token out (in the part after `#`, which is never sent to the server, or in the path with analytics redacted) is settled by a spike (checklist A0.1). Secret pages send `Referrer-Policy: no-referrer`.
- Prayer pages are `no-store`; no prayer text, crew name or person's name in a page title, address or analytics event. The only email that names a crew or person is the invite.
- Retention: requests are deleted on the author's request or account deletion; answered requests can optionally auto-delete after a period the author picks (a later option; version 1 keeps them until deleted). Sessions and login tokens expire and are cleaned by the retention job.
- The privacy policy, `docs/privacy.md` and the threat model need new sections (accounts, crews, prayer content, invited emails, the session cookie, processors: Postmark).
- Postgres backups contain ciphertext only. The encryption key stays in Vercel Sensitive variables; losing it loses all requests, so key backup and rotation go into the rotate-secrets runbook.

## Not in version 1 (kept out on purpose)

- Notifications of any kind beyond the invite email and the sign-in email. Without them a crew can go quiet; the later fix is the planned Web Push ([web_push.md](web_push.md)), or one optional weekly email. Version 1 relies on the member opening the app.
- Comments, replies and other reactions. (The single "I prayed" tap is in version 1.)
- Public prayer requests shown to other visitors. (The separate form that emails `prayer@` is kept for later, see the top of this file.)
- Admin or moderation view of requests.
- Passwords, social login, passkeys.
- Native app, file or photo attachments, search, crew chat.

## Decisions

| # | Decision (1 to 12: 2026-11-22; 13 to 22: 2026-11-28) |
|---|---|
| 1 | Keep the public form. Prayer requests from it go to `prayer@wordonthewater.net`, general messages to `hello@wordonthewater.net`. |
| 2 | Invites by link and by email. |
| 3 | Only the crew owner invites. |
| 4 | The author picks individual members, and can share across every crew they belong to. |
| 5 | ~~Prayer is visible only after sign-in, in the menu first.~~ Replaced by 13. Prayer **content** still needs sign-in. |
| 6 | Magic link only for the first release. Google sign-in comes later. |
| 7 | First name only. |
| 8 | No date. Investigating only. Start Postmark on the free tier and upgrade if needed. |
| 9 | Picker opens with nobody ticked. |
| 10 | "I prayed" tap in version 1 (count only). |
| 11 | "New" badge in version 1. |
| 12 | Report a problem goes to `support@wordonthewater.net` (a new address, to be created as a Squarespace forward like `hello@`). |
| 13 | A Prayer tab in the bottom bar and a Prayer link in the menus, for everyone. |
| 14 | Signed-out visitors get a welcome page that explains the feature, with one sign-in button. |
| 15 | The tab is added to the site bar only. The chat and Bible reader bars do not change. |
| 16 | The tab and links appear only when the whole feature is ready (`CREW_ENABLED`). |
| 17 | 18 and over. A new account needs the "I am 18 or older" box. |
| 18 | An emailed invite works only for that email address. A shared link works for whoever uses it first. |
| 19 | Old shares do not come back: they are deleted when two people stop sharing their last crew. |
| 20 | A session ends after 30 days without a visit, and always 90 days after sign-in. |
| 21 | The four tabs are sized to their words, with 16px margins at every width. Replaces equal tabs, and the 10px margins below 360px chosen earlier the same day. |
| 22 | On Prayer pages, Shore takes the Prayer tab's place. |

## Who sees a request (decided: per person)

The author chooses individual members, for example a spouse and a pastor and not the rest of the crew. The rejected simpler design was one "share with my crew" switch. For faith and health topics, the privacy choice is the reason the feature exists.

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
- **Postmark:** every sign-in link and every invite email is one message. The free tier (about 100 a month, check the current figure) covers roughly 100 sign-ins and invites a month. Someone who visits at least monthly asks for a link about every 90 days, not every visit.
- **Rough sizing:** 30 active people signing in monthly plus a few invites is well inside the free tier. A few hundred active people would pass it and need the first paid plan (a few dollars to about USD 15 a month).
- **Neon, Upstash, Vercel:** the new tables and the extra requests fit the current plans at this size. No new service is needed.
- **Your time:** the real cost is DNS setup once and watching deliverability (a link in spam is a failed sign-in). The 6-digit code in the email gives people a way in even when the link opens in the wrong browser.
- **Upgrade trigger:** Postmark's dashboard shows the monthly count; move to a paid plan before the free allowance runs out.

## Open questions

None. The six raised while redrawing were answered on 28 November (decisions 17 to 22). Still to do before launch of the feature: have someone qualified confirm the age and privacy wording.
