# Secret keys and Vercel variables

Step by step setup of the keys that step 1.3 (email sign-up) needs. Do the sections in order: the keys you create in Cloudflare and Kit are the values you paste into Vercel. Tick each box as you go.

**Rules for secrets**
- Never paste a secret into a chat, a pull request, an issue or a file in the repository. Copy it from the screen where it is shown straight into the field where it goes.
- Keep a copy only in your password manager.
- Variables marked **Sensitive** in Vercel cannot be read again after saving. That is intended.
- Production's Kit key never goes into Preview or Development once real subscribers exist (CLAUDE.md section 6.6).

**Names used**
- Vercel team `thecodeblock`, projects `wotw-api` (the FastAPI service) and `wotw-web` (the website).
- Local development reads the root `.env`, which already holds Cloudflare's test keys and your Kit key. Nothing in this file changes `.env`.

---

## A. Cloudflare Turnstile: two widgets

One widget for production and one for Preview, so a leak in one does not affect the other.

### A1. Production widget

- [ ] Sign in at https://dash.cloudflare.com and open **Turnstile** in the left menu (choose the free plan if asked)
- [ ] Click **Add widget**
- [ ] Widget name: `wotw production`
- [ ] Hostnames: add `wordonthewater.net` and `www.wordonthewater.net`
- [ ] Widget mode: **Managed**
- [ ] Create the widget
- [ ] Copy the **Site key** to your password manager, labelled `Turnstile production site key`
- [ ] Copy the **Secret key** to your password manager, labelled `Turnstile production secret`

### A2. Preview widget

- [ ] Click **Add widget** again
- [ ] Widget name: `wotw preview`
- [ ] Hostnames: add `vercel.app` (covers the Vercel preview addresses) and `localhost`
- [ ] Widget mode: **Managed**
- [ ] Create the widget
- [ ] Copy the **Site key** to your password manager, labelled `Turnstile preview site key`
- [ ] Copy the **Secret key** to your password manager, labelled `Turnstile preview secret`

---

## B. Kit: the Preview form (recommended)

Until launch Kit holds only test subscribers, so there are two ways to do this. Pick one.

**Quick:** use the same Kit key and form id in Preview and Production for now. Fine before launch. You must split them before real subscribers join.

- [ ] Choose **Quick** and carry on to section C (and remember to come back before launch, see section F)

**Clean:** a second form just for Preview.

- [ ] In Kit, create a second form named `Word On The Water sign-up (test)`
- [ ] Switch **double opt-in** on, with the same confirmation email as the real form and the sender `hello@wordonthewater.net`
- [ ] Set the redirect after confirming to your preview or production `/thank-you` address
- [ ] Note the new form's id (the number in the form's address) as `Kit test form id`
- [ ] If Kit lets you create a second API key (Kit developer settings), create one named `wotw-preview` and keep it as `Kit preview API key`

Where the production values are: the Kit API key you saved earlier, and the form id in your local `.env` as `KIT_FORM_ID` (the form `Word On The Water sign-up`).

---

## C. Vercel: variables for the API project (`wotw-api`)

Open https://vercel.com, team `thecodeblock`, project `wotw-api`, then **Settings → Environment Variables**. For each row click **Add**, enter the name and value, tick only the environment listed, and switch **Sensitive** on where the table says Yes. To give Production and Preview different values for one name, add the variable twice, one environment each time.

### C1. Production

- [ ] `KIT_API_KEY` = your Kit API key. Environment: Production. Sensitive: Yes
- [ ] `KIT_FORM_ID` = the id of the real form `Word On The Water sign-up`. Environment: Production. Sensitive: No
- [ ] `TURNSTILE_SECRET_KEY` = `Turnstile production secret`. Environment: Production. Sensitive: Yes

### C2. Preview

- [ ] `KIT_API_KEY` = `Kit preview API key` (or the same key as production if you chose Quick). Environment: Preview. Sensitive: Yes
- [ ] `KIT_FORM_ID` = `Kit test form id` (or the production form id if you chose Quick). Environment: Preview. Sensitive: No
- [ ] `TURNSTILE_SECRET_KEY` = `Turnstile preview secret`. Environment: Preview. Sensitive: Yes

### C3. Check

- [ ] Do not tick **Development** for any of the three variables (your local `.env` covers development)
- [ ] The list shows each name twice (Production and Preview), and the secrets show as Sensitive

`KIT_WEBHOOK_SECRET` is not needed yet. It comes from the webhook registration in section G.

---

## D. Vercel: variables for the web project (`wotw-web`)

Open project `wotw-web`, then **Settings → Environment Variables**.

### D1. The site key (new)

- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = `Turnstile production site key`. Environment: Production. Sensitive: not available (a public key)
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = `Turnstile preview site key`. Environment: Preview

This value is built into the site when it is built. A deployment made before you added it does not have it, so a new deployment is needed after this step.

### D2. Already there? (set in step 0.9)

The sign-up form needs these to reach the API. Check that they exist; add only what is missing.

- [ ] `SERVICE_TOKEN` exists for Production and Preview (Sensitive), with the same value as the API project's `SERVICE_TOKEN` for that environment
- [ ] `API_BASE_URL` exists for Production, pointing at the API project's production address (Previews work out their own API address, so no value is needed there)
- [ ] `API_BYPASS_SECRET` exists if the API project is behind Deployment Protection (it is the API project's protection-bypass secret)

---

## E. After the variables are in

- [ ] Tell Claude Code the variables are set (without sharing any values)
- [ ] Claude Code pushes the branch and opens the pull request
- [ ] Open the Vercel preview of the pull request and check that the sign-up band shows at the bottom of the home page
- [ ] Try a sign-up with an email address you can read, wait for the confirmation email, click the link and check that you land on `/thank-you`
- [ ] Production changes only when you redeploy it (your step). Do that after the pull request is merged

---

## F. Before launch (not now)

- [ ] Split Kit: Production uses the real form and key, Preview and Development use the test form and key, or a separate Kit account
- [ ] Production uses only the production Turnstile widget keys. The API refuses Cloudflare's test secrets in production by design
- [ ] Rotate any secret that was ever shown in a chat, a screenshot or a log

---

## G. Later: the Kit webhook secret

This is a separate step, done once the preview is working.

- [ ] Decide how Kit reaches the protected API project (a Vercel protection-bypass value in the address, or a route on the web project). Claude Code will propose the details
- [ ] Run `make kit-webhook URL=https://<api address>/v1/webhooks/kit`. It saves the signing secret into your local `.env` as `KIT_WEBHOOK_SECRET` without printing it (Kit shows it only once)
- [ ] Copy that value from `.env` into the `wotw-api` project as `KIT_WEBHOOK_SECRET` (Sensitive), for the environment you registered it for
- [ ] Confirm with the first real delivery that signatures verify (see ADR 0008)
