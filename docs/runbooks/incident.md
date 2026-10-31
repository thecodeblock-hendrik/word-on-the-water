# Incident response

For a suspected breach, leaked secret, outage or abuse. One responder (the owner) for now. Stay calm, write down times as you go, and do the steps in order: **contain, assess, notify, fix, review**.

## Know your limits first

- **Evidence expires.** Vercel keeps logs for a short time. Until a log drain exists (step 0.10), export the relevant logs from the Vercel dashboard (Logs) as soon as an incident starts.
- **No prayer text or email address is ever in our logs**, by design. Logs show path, status, request ID and timing, so they tell you what was called, not whose data it was.
- **Backups** hold deleted-on-request data until they expire (see `docs/privacy.md`).

## 1. Contain

Pick what fits; most can be done in minutes.

| Situation | Action |
|---|---|
| A secret leaked | Rotate it now: `docs/runbooks/rotate-secrets.md` |
| Attack traffic or form abuse | Vercel Firewall: turn on Attack Challenge Mode, add a rate-limit or block rule for the route (Pro adds more rules) |
| A bad deploy | Vercel **Instant Rollback** to the previous production deployment (dashboard) |
| Data being exfiltrated through an endpoint | Block the route in the Firewall, or roll back to a deployment without it |
| Database credentials exposed | Rotate the role password on Neon, then check the Neon console for unknown connections |
| A third-party account taken over | Change its password, revoke sessions and tokens, check 2FA, contact the provider |

## 2. Assess

Answer, and write the answers in the incident note:

1. What happened and when did it start and stop? Use the request ID from any failing response to find the log lines.
2. What data could have been read or changed: subscribers, prayer requests (special category), contact messages, or only secrets?
3. How many people, and which of them can be identified?
4. Is it still possible? If yes, go back to contain.

## 3. Notify

| Who | When | How |
|---|---|---|
| Data protection authority (GDPR) | Within **72 hours** of becoming aware, unless unlikely to put people at risk | The authority of the people affected |
| Information Regulator (POPIA) | As soon as reasonably possible | Their breach notification form |
| The affected people | Without undue delay where the risk to them is high; always for prayer requests | Email from `hello@wordonthewater.net`, in plain words: what happened, what data, what you did, what they can do |
| Providers (Vercel, Neon, Upstash, Kit, Postmark, GitHub) | When their service or account is involved | Their security contact |

Prayer requests can reveal belief, health and family matters: treat any exposure as high risk and tell the people.

## 4. Fix

Close the cause, not only the symptom. A bug fix comes with a test that fails before the fix (CLAUDE.md section 14). Update `docs/threat-model.md` if the incident showed a threat or a control that was missing.

## 5. Review

Within a week, write `docs/incidents/YYYY-MM-DD-title.md` (create the folder with the first one): timeline, cause, impact, what worked, what to change. No names of affected people, no personal data, no secrets. Turn each action into a plan step or a ticket.

## Quick contacts

- Owner and responder: `hello@wordonthewater.net`
- Reporters of vulnerabilities write to `hello@wordonthewater.net` (see `SECURITY.md`); acknowledge within 3 business days.
