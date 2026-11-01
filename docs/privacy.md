# Privacy v1

Data inventory, retention and lawful basis for Word on the Water. Version 1, written 2026-10-31 at the end of Phase 0. **No personal data is collected yet.** Sign-up and the prayer and contact forms arrive in Phase 1 (steps 1.3 to 1.5).

This is the engineering record the public privacy policy page (step 1.6) is written from. It is not legal advice; Hendrik reviews the policy text before launch.

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
| Theme preference (light or dark) | Show the chosen theme without a flash | One first-party cookie on the visitor's device (planned, step 1.1) | Strictly necessary for a feature the visitor asked for |
| Bot check result | Block automated submissions | Cloudflare Turnstile, called from the form (planned) | Legitimate interest in security |
| Error reports | Fix faults | Sentry with `sendDefaultPii: false` and scrubbing (planned, step 0.10) | Legitimate interest; no personal data is sent |

No data about children is sought and the site is not aimed at them. No advertising or tracking cookies are used.

## Retention

Enforced by a daily retention job (step 1.7). Prayer and contact rows already carry a `delete_after` column; the other rules use status and creation time.

| Data | Kept for | Then |
|---|---|---|
| Unconfirmed subscribers | 7 days | Deleted from Neon and from Kit |
| Active subscribers | Until they unsubscribe, then the unsubscribe record | Deleted on request |
| Prayer requests | 90 days (`delete_after`) | Deleted or anonymised |
| Contact messages | 12 months (`delete_after`) | Deleted |
| Audit log | 1 year | Deleted |
| Rate-limit keys | The limit window (minutes to one hour) | Expire in Redis |
| Neon point-in-time recovery | At least 7 days on the paid plan | Rolls off |
| Nightly database dumps (encrypted) | 30 days from upload | Deleted by the bucket's lifecycle rule |

## Who else handles the data

| Service | Holds | Location |
|---|---|---|
| Vercel | Site, API, logs, analytics | `fra1` (Frankfurt) for functions; global edge network |
| Neon | The database | `aws-eu-central-1` (Frankfurt) |
| Upstash | Hashed rate-limit keys | Region to confirm |
| Kit | Newsletter subscribers and the emails sent to them | Provider's locations |
| Postmark | Notification and transactional email in transit | Provider's locations |
| Cloudflare | Turnstile bot check; R2 storage of the nightly database dumps, encrypted before upload so Cloudflare cannot read them | Turnstile global; R2 bucket in Western Europe (WEUR) |
| Sentry | Scrubbed error reports | Provider's locations |
| Squarespace | DNS, and forwarding of `hello@` and `prayer@` to the owner's own mailbox | Provider's locations |
| The owner's own mailbox provider | Forwarded notifications, including consented prayer text | To confirm |

Providers outside the EU and South Africa are covered by their standard contractual terms; the policy page names them. A data processing agreement is needed with each provider that holds subscriber or prayer data: Kit, Postmark, Neon, Vercel, Sentry, Cloudflare (R2 holds the encrypted dumps).

## Rights and how they are met

- **Withdraw consent, unsubscribe:** the unsubscribe link in every email (Kit), or a message to `hello@wordonthewater.net`.
- **Access and a copy:** on request to `hello@wordonthewater.net`, answered within 30 days; the owner exports the person's rows from Neon and Kit.
- **Correction and deletion:** the same route; deletion removes the Neon rows and the Kit subscriber (the exact Kit API call or dashboard action is confirmed in the step 1.3 spike), and the data ages out of backups within the retention above.
- **Complaints:** the policy names the relevant regulator (the EU authority of the visitor's country, or South Africa's Information Regulator).

## Breaches

Contain, assess, then notify. Under the GDPR the authority is told within 72 hours of becoming aware, and affected people without undue delay where the risk is high; POPIA requires notice to the Information Regulator and affected people as soon as reasonably possible. The incident runbook (step 0.10) holds the steps.

## Decisions needed from Hendrik

1. **Who is the data controller and what is the legal entity name and address** for the policy and the email footer (also required in newsletters).
2. **Which regulator and jurisdiction** to name first: where the owner and most readers live.
3. ~~How long nightly dumps are kept.~~ Decided: 30 days, enforced by an R2 lifecycle rule. A dump holds deleted-on-request data until it expires, so erased data is gone from backups within 30 days.
4. **Upstash region** and **which mailbox provider receives the forwards.**
5. **A data processing agreement** accepted with each provider listed above.

Keep this file in step with the code: when a feature adds a field, a service or a retention rule, update it in the same change.
