# Privacy v1

Data inventory, retention and lawful basis for Word on the Water. Version 1, written 2026-10-31 and brought up to date 2026-11-21. **The site has been live since 2026-11-21; the launch, with the first devotional and the first weekly email, is on 28 November 2026.** Real visitor data can now be collected. Until launch day the only sign-ups are the owner's own test addresses, which are cleaned up in Kit's dashboard by hand. The sign-up (with Kit double opt-in), the Bible reader cookies and the Ask the Word chat are live. The prayer and contact forms (steps 1.4 and 1.5) are deferred past the launch, so the rows for them below describe the plan, not what runs today.

This is the engineering record the public privacy policy page is written from. The page is `/privacy` and its text is `apps/web/src/content/privacy.ts`: keep the two in step. The page lists only what is true at launch, so it leaves out the prayer and contact forms (and Postmark) until they are built. It is not legal advice; Hendrik reviews the policy text before launch.

Designed to comply with the **GDPR** and **POPIA** by default: collect the minimum, record consent, keep data only as long as listed, and delete on request.

## Data inventory

| Data | Why we hold it | Where | Lawful basis (GDPR / POPIA) |
|---|---|---|---|
| Email address and optional first name (newsletter) | Send the weekly devotional | Kit (source of truth) and a status mirror in Neon | Consent, given through double opt-in, with the time and source recorded |
| Prayer request text, optional first name and email, two consent flags | Pray for the person and reply if asked | Neon, encrypted in the application (planned, step 1.4); emailed to `prayer@wordonthewater.net` in full only if the visitor agrees | Explicit consent (special category data: religious belief, possibly health or family details) |
| Contact message: name, email, subject, text | Answer the message | Neon; notification to `hello@wordonthewater.net` | Legitimate interest in answering an enquiry the visitor started |
| Hashed IP address and hashed email (rate-limit keys) | Stop abuse and spam | Upstash Redis, as salted HMAC hashes that expire with the window | Legitimate interest in security |
| Request logs: path, status, request ID, timing | Run and debug the service | Vercel logs (short built-in retention) and later a log drain | Legitimate interest in security and operation. Bodies, emails and prayer text are never logged |
| Page analytics and Core Web Vitals | Understand reading and speed | Vercel Web Analytics and Speed Insights: cookieless, no personal profile | Legitimate interest; no consent banner is needed because nothing is stored on the device |
| Theme preference (light or dark) | Show the chosen theme without a flash | One first-party cookie (`theme`, a year) on the visitor's device | Strictly necessary for a feature the visitor asked for |
| Last Bible and passage read | Open the Bible reader in the Bible you used last, at the passage you were reading (John 3:16 on a first visit) | Two first-party cookies (`bible-version` and `bible-passage`, for example `web` and `romans.8.28-30`, a year each, no personal data) | Strictly necessary for a feature the visitor asked for |
| Chat questions (Ask the Word, behind `CHAT_ENABLED`) | Answer a question about the faith | Not stored. The text is matched in memory on our API against a local knowledge base, never sent to a third party, and never written to logs or error reports; only the outcome kind, the matched entry id and the time taken are logged (a test proves no message text reaches logs or Sentry). Personal details are rejected before use | Consent (the visitor asks the question); data minimised by design |
| Chat thread in the browser | Let a visitor ask follow-up questions | The visitor's own tab (`sessionStorage`), gone when the tab closes or when they press Clear chat; never sent to us except the new message and the ids of entries already shown | Strictly necessary for a feature the visitor asked for |
| Bot check result | Block automated submissions | Cloudflare Turnstile, loaded only when a visitor reaches or uses the sign-up form (not on every page view); Cloudflare receives the visitor's IP address and browser signals to judge the check | Legitimate interest in security |
| Error reports | Fix faults | Sentry with `sendDefaultPii: false` and scrubbing (web and API) | Legitimate interest; no personal data is sent |

No data about children is sought and the site is not aimed at them. No advertising or tracking cookies are used.

## Retention

Enforced by a daily retention job (`/cron/retention`, 03:30 UTC, step 1.7). Prayer and contact rows carry a `delete_after` column; the other rules use status and creation time. The job deletes in our database only: Kit holds its own copy of a subscriber, and Kit's API cannot delete one.

| Data | Kept for | Then |
|---|---|---|
| Unconfirmed subscribers | 7 days | Deleted from Neon by the job. The daily Kit sync (03:00 UTC, before the job at 03:30) first marks everyone who confirmed in Kit as active, so only people who never confirmed are deleted. In Kit they stay as unconfirmed (Kit never emails them) until the owner deletes them in the Kit dashboard, a monthly task: Kit's API has no delete, and unsubscribing them through the API would block a later honest sign-up |
| Active subscribers | Until they unsubscribe, then the unsubscribe record | Deleted on request |
| Prayer requests | 90 days (`delete_after`) | Deleted or anonymised |
| Contact messages | 12 months (`delete_after`) | Deleted |
| Audit log | 1 year | Deleted |
| Email outbox (the queue of emails to send: it holds the recipient's address) | Sent: 7 days. Failed: 30 days, so the cause can be looked at | Deleted |
| Rate-limit keys | The limit window (minutes to one hour) | Expire in Redis |
| Neon point-in-time recovery | At least 7 days on the paid plan | Rolls off |
| Nightly database dumps (encrypted) | 30 days from upload | Deleted by the bucket's lifecycle rule |

## Who else handles the data

| Service | Holds | Location |
|---|---|---|
| Vercel | Site, API, logs, analytics | `fra1` (Frankfurt) for functions; global edge network |
| Neon | The database | `aws-eu-central-1` (Frankfurt) |
| Upstash | Hashed rate-limit keys | Frankfurt, Germany (confirmed 2026-11-18) |
| Kit | Newsletter subscribers and the emails sent to them | Provider's locations |
| Google (reCAPTCHA) | Only on Kit's own hosted sign-up page, which we send returning readers to when they cannot rejoin through our form (Invisible reCAPTCHA, switched on 2026-11-21): the visitor's data goes to Google there. Never on our own site, which uses Cloudflare Turnstile | Provider's locations |
| Postmark | Notification and transactional email in transit | Provider's locations |
| Cloudflare | Turnstile bot check; R2 storage of the nightly database dumps, encrypted before upload so Cloudflare cannot read them | Turnstile global; R2 bucket in Western Europe (WEUR) |
| Sentry | Scrubbed error reports | Provider's locations |
| Squarespace | DNS, and forwarding of `hello@` and `prayer@` to the owner's own mailbox | Provider's locations |
| Google (Gmail), the owner's own mailbox | Mail forwarded from `hello@` (and later `prayer@`), including consented prayer text. A personal Gmail has no signable DPA; accepted for launch because forwarding carries only mail people send us. Revisit (Google Workspace) before the prayer form is built | Provider's locations (confirmed 2026-11-18) |

Providers outside the EU and South Africa are covered by their standard contractual terms; the policy page names them. A data processing agreement (DPA) is needed with each provider that holds subscriber or prayer data: Kit, Postmark (once the forms exist), Neon, Vercel, Sentry, Cloudflare (R2 holds the encrypted dumps), Upstash.

### Data processing agreements (checked 2026-11-18)

| Provider | Status | Version | Left to do |
|---|---|---|---|
| Kit | Incorporated through its Terms (kit.com/dpa; includes EU SCCs and the UK IDTA) | Updated 9 Oct 2026 | Print kit.com/dpa to PDF (no download offered) |
| Neon | Incorporated through the Databricks DPA and the Neon schedule; an e-signed copy is optional (signing replaces any existing DPA) | Schedule 14 Oct 2026; DPA sample 21 Jul 2023 | PDF saved. Consider the e-signature before prayer requests are stored (special category data) |
| Vercel | Incorporated through its Terms, but the DPA text is written for Enterprise plans; no DPA in the dashboard on Hobby | DPA effective 31 Mar 2026 | Print vercel.com/legal/dpa to PDF; the move to Pro before launch (production_checklist.md, Part B) must include a re-check of the DPA and the commercial-use terms |
| Sentry | Accepted in the dashboard (org thecodeblock); data stored in the EU; aggregated-data use is off | v5.1.0, signed 18 Nov 2026 | None |
| Cloudflare | Incorporated through the Self-Serve Subscription Agreement | v6.4, effective 3 Apr 2026 | None (PDF saved) |
| Upstash | Incorporated through its Terms, no signature needed | Updated April 2025 | None (PDF saved). Both Redis databases (production and preview) are in Frankfurt |

Vercel's "Improve models with my data" setting was on until 2026-11-18 and was switched off that day (Settings, Data Preferences). Vercel says this stops sharing going forward only. The site was not public, so the data involved was test data and source code, not visitor data. Neither Vercel nor Google (Gmail, a personal account with no signable DPA, accepted for launch) is a gap in the public policy, but both are the first things to revisit: Vercel on the move to Pro, Google before the prayer form.

## Rights and how they are met

- **Consent record:** each sign-up stores when it happened, which page it came from and the version of the wording shown beside the button (`consent_text_version`). The version is `v2` since the privacy-policy link was added to that line on 2026-11-14; change it whenever that wording changes.
- **Withdraw consent, unsubscribe:** the unsubscribe link in every email (Kit), or a message to `hello@wordonthewater.net`.
- **Access and a copy:** on request to `hello@wordonthewater.net`, answered within 30 days; the owner exports the person's rows from Neon and Kit.
- **Correction and deletion:** the same route; deletion removes the Neon rows and the Kit subscriber (Kit's API cannot delete a subscriber, so deleting from Kit is a dashboard action; confirmed in the step 1.3 spike), and the data ages out of backups within the retention above.
- **Complaints:** the policy names the relevant regulator (the EU authority of the visitor's country, or South Africa's Information Regulator).

## Breaches

Contain, assess, then notify. Under the GDPR the authority is told within 72 hours of becoming aware, and affected people without undue delay where the risk is high; POPIA requires notice to the Information Regulator and affected people as soon as reasonably possible. The incident runbook (step 0.10) holds the steps.

## Decisions needed from Hendrik

1. **Who is the data controller and what is the legal entity name and address** for the policy and the email footer (also required in newsletters). Answered 2026-11-14: the privacy page names Word On The Water, the registered name, and gives PO Box 6055, Port Elizabeth, Eastern Cape 6001 (the PO Box Kit prints in every email footer). If the registered name ever changes, change it there.
2. ~~Which regulator to name first.~~ Decided 2026-11-18: keep the policy as it is (South Africa's Information Regulator, and the visitor's own EU authority for EU readers).
3. ~~How long nightly dumps are kept.~~ Decided: 30 days, enforced by an R2 lifecycle rule. A dump holds deleted-on-request data until it expires, so erased data is gone from backups within 30 days.
4. ~~Upstash region and the mailbox provider.~~ Answered 2026-11-18: Upstash in Frankfurt, forwards received by Gmail.
5. ~~A data processing agreement with each provider.~~ Checked 2026-11-18, see the table above. Open: print the Kit and Vercel DPAs to PDF, review the Vercel plan (Hobby is non-commercial), and decide on Neon's optional e-signature.

Keep this file in step with the code: when a feature adds a field, a service or a retention rule, update it in the same change.

## Chat notice (the line shown with the chat)

"Please don't share personal details." above the question box, and in the public policy ([privacy page](../apps/web/src/content/privacy.ts), shown only while the chat is on): the questions you type are matched against our own written answers on our server, are not stored, not sent to anyone else and not written to our logs; we keep only a count; messages that look like personal details are refused; the conversation lives only in your browser tab and is gone when you close it or press Clear chat.
