# Kit webhook: attach the domain, redeploy, register, set the secret

Goal: Kit tells our site when a subscriber confirms, unsubscribes, bounces or complains, so our database mirror stays right. The route is built (`/api/webhooks/kit` on `wotw-web`, PR #83). Kit can only reach a **public** address, so the webhook is registered for production, on the real domain.

Never paste a secret into chat or a file in the repo. The webhook secret goes from the local `.env` straight into Vercel.

## Read this first

- **Attaching `wordonthewater.net` to Vercel replaces your current Squarespace site with the new site.** That is a launch step (PLAN.md 1.9), not just a webhook step. Only do Part 1 when you are happy for the new site to be public.
- If you are not ready, stop after Part 0. Nothing is lost by waiting: no subscribers are being sent to production yet, so the webhook can be registered at launch.
- Email is not affected as long as you **leave the MX records alone** (`hello@` and `prayer@` forwards keep working).

---

## Part 0. Before you start

- [ ] PR #83 (the webhook route) is merged into `main`. Ask Claude Code to merge it once its checks are green.
- [ ] A production deployment of `wotw-web` built from that merge is **Ready**. In Vercel, `wotw-web`, Deployments, filter **Production**: the newest one has the merge commit message "forward Kit webhooks...". If the newest one is Cancelled or older, press the three dots on the latest Ready one, then **Redeploy**.
- [ ] You have Squarespace and Vercel open in two tabs, and a password manager entry for the Squarespace login.

---

## Part 1. Attach `wordonthewater.net` to `wotw-web`

### 1a. Save the old DNS (so you can undo)

- [ ] Squarespace, **Domains**, `wordonthewater.net`, **DNS Settings**. Take a screenshot of **every** record (A, CNAME, MX, TXT). Save it somewhere safe.
- [ ] Note the MX records and any TXT record that starts with `v=spf1`: you will not touch them.

### 1b. Add the domain in Vercel

- [ ] Vercel, project **`wotw-web`**, **Settings**, **Domains**, **Add**.
- [ ] Add `wordonthewater.net` and attach it to **Production**.
- [ ] Add `www.wordonthewater.net` and set it to **redirect to** `wordonthewater.net` (apex is primary).
- [ ] Vercel now shows "Invalid configuration" and lists the DNS records it needs: an **A record** for the apex and a **CNAME** for `www`. Keep that page open. Copy the exact values from there; do not type them from memory.

### 1c. Change the records in Squarespace

- [ ] In Squarespace DNS, find the existing **A records** for the apex (`@`) that point at Squarespace, and the `www` record.
- [ ] Delete or replace them with the A record and `www` CNAME Vercel showed. If Squarespace marks some records as "Squarespace defaults" for the website, remove those default records for the apex and `www` only.
- [ ] Do **not** change the MX records, the SPF TXT record, or any DKIM or DMARC records.
- [ ] Save.

### 1d. Check it

- [ ] Wait a few minutes, up to a few hours for DNS. In Vercel, Domains: both rows turn to **Valid Configuration** and show a certificate.
- [ ] Open `https://wordonthewater.net`: it shows the new site, not the Squarespace one.
- [ ] Open `https://www.wordonthewater.net`: it redirects to `https://wordonthewater.net`.
- [ ] Send a test email to `hello@wordonthewater.net` from another address and confirm it still arrives in your own mailbox.
- [ ] If anything is wrong and you need to go back: restore the A and CNAME records from your 1a screenshot in Squarespace.

---

## Part 2. Check the route works on production (before registering)

You should see this chain: public website, then our forwarder, then the protected API. Use your terminal.

- [ ] Run: `curl -i https://wordonthewater.net/api/webhooks/kit` and expect **405** (only POST is accepted).
- [ ] Run: `curl -i -X POST https://wordonthewater.net/api/webhooks/kit -d '{}'` and expect **503**. A 503 here is good: it means the forwarder reached the production API (through its protection) and the API says "no webhook secret set yet". You will fix that in Part 4.
- [ ] If you see **502** instead, the forwarder cannot reach the API: check that `API_BASE_URL` and `API_BYPASS_SECRET` are set in `wotw-web` Production, then redeploy. Tell Claude Code.
- [ ] If you see **401**, the secret is already set on the API (fine, go on).

---

## Part 3. Register the webhook in Kit

- [ ] Check that your root `.env` holds the Kit API key of the Kit account that owns the production list (`KIT_API_KEY`). Kit webhooks are account-wide.
- [ ] From the repo root in your terminal: `make kit-webhook URL=https://wordonthewater.net/api/webhooks/kit`
- [ ] Expect: `Registered Kit webhook <id>. The signing secret is saved in .env as KIT_WEBHOOK_SECRET.` The secret is **not** printed.
- [ ] If it says `... is already registered in Kit`: in Kit's developer settings (webhooks), delete the old endpoint with that address, then run the command again. Kit shows a secret only when it is created.
- [ ] In Kit, developer settings, webhooks: the endpoint is listed with the four events (`subscriber.activated`, `.unsubscribed`, `.bounced`, `.complained`).

---

## Part 4. Put the secret in Vercel (wotw-api, Production only)

- [ ] Copy the secret without showing it: `grep '^KIT_WEBHOOK_SECRET=' .env | cut -d= -f2- | pbcopy`
- [ ] Vercel, project **`wotw-api`**, **Settings**, **Environment Variables**, **Add**.
- [ ] Name `KIT_WEBHOOK_SECRET`, paste the value, tick **Production only**, turn **Sensitive** on, save.
- [ ] Clear your clipboard: `pbcopy </dev/null`
- [ ] Do **not** add it to Preview (a preview must never hold the production secret; Kit cannot reach previews anyway).
- [ ] Redeploy `wotw-api` **Production**: Deployments, filter Production, newest Ready, three dots, **Redeploy**. Wait for Ready. A new variable reaches only a new deployment.
- [ ] Run again: `curl -i -X POST https://wordonthewater.net/api/webhooks/kit -d '{}'` and expect **401** now (the API checks the signature and refuses an unsigned call). 401 instead of 503 proves the secret is in place.

---

## Part 5. Confirm with a real delivery

This proves Kit's signature is accepted. (The key format was inferred from Kit's docs and has never seen a real delivery.)

- [ ] Cause an event in Kit: confirm or unsubscribe a **test** subscriber (for example your `test@wordonthewater.net` address) in Kit's interface, or sign up and confirm on production once the Kit form redirect is set.
- [ ] Kit, developer settings, webhooks: the endpoint's recent deliveries show **200**.
- [ ] If Kit shows **401**: the signature check failed. Tell Claude Code; the likely cause is the secret format, and the API logs will show it.
- [ ] If it shows **502 or 503**: the API was unreachable or had no secret. Re-check Part 4.
- [ ] Tell Claude Code that a delivery went through. It reads the API logs for `/v1/webhooks/kit` (expect a 200) and ticks the PLAN.md item.

---

## Part 6. Close it out

- [ ] Tell Claude Code Parts 1 to 5 are done, so it ticks the matching items in `docs/PLAN.md` step 1.3 (register, confirm first delivery) and step 1.9 (domain attached).
- [ ] Still open after this, from PLAN.md: the Kit form redirect to `/thank-you`, the production smoke test on the real domain, and the 1.9 DNS records for email (SPF, DKIM, DMARC).
