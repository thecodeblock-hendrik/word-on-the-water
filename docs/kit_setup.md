# Kit email setup - wordonthewater.net

_Last updated: 15 November 2026_

## Status: done

Kit now sends mail authenticated as **wordonthewater.net**. A test email from `hello@wordonthewater.net` reached the Gmail inbox, and SPF, DKIM and DMARC all passed. Double opt-in confirmation emails can now reach subscribers.

---

## The problem we fixed

- The domain's DMARC policy is strict: `p=reject; adkim=s; aspf=s`.
- Kit was sending "from" `hello@wordonthewater.net` with Kit's own signature and return-path. Neither matched our domain, so Gmail treated the mail as failing DMARC and rejected it.
- Result: a Kit confirmation email never arrived, so nobody could subscribe.

---

## What was done

### 1. Kit - verified sending domain
- **Where:** Kit → Settings → Email → Verified sending domains
- Added `wordonthewater.net` as a verified sending domain.
- Status: **Verified** (green check).
- Default from address: **Word On The Water <hello@wordonthewater.net>** (confirmed).
- Kit's suggested `_dmarc` TXT record (`v=DMARC1; p=none;`) was **not** added. We already have a DMARC record, and a second one would break DMARC.
- "Set this up for me" was **not** used, so Kit has no direct access to our DNS.

### 2. Squarespace DNS - three custom records added
- **Where:** Squarespace → Domains → wordonthewater.net → DNS → Custom records

| Type  | Host              | Value                                   | Purpose |
|-------|-------------------|-----------------------------------------|---------|
| CNAME | `ckespa`          | `spf.dm-811f49e1.sg9.convertkit.com`    | Kit return-path / bounce domain (handles SPF for Kit) |
| CNAME | `cka._domainkey`  | `dkim.dm-00675d2f.sg9.convertkit.com`   | Kit DKIM key 1 |
| CNAME | `cka2._domainkey` | `dkim2.dm-088f367b.sg9.convertkit.com`  | Kit DKIM key 2 |

### 3. Records deliberately left unchanged
These belong to the **Squarespace Email Forwarding** preset, which runs the `hello@` and `prayer@` forwards (via Mailgun). Don't edit them.

| Type | Host             | Value |
|------|------------------|-------|
| MX   | `@`              | `mxa.mailgun.org` (priority 10) |
| MX   | `@`              | `mxb.mailgun.org` (priority 10) |
| TXT  | `@`              | `v=spf1 include:mailgun.org ~all` |
| TXT  | `_dmarc`         | `v=DMARC1; p=reject; pct=100; fo=1; ri=3600; sp=reject; adkim=s; aspf=s; rua=…mailgun / ondmarc…` |
| TXT  | `krs._domainkey` | Mailgun DKIM key |

**Why no SPF or DMARC changes were needed:**
- **SPF:** Kit's bounce address is `ckespa.wordonthewater.net`, and the `ckespa` CNAME covers its SPF. Kit does **not** need an `include:` in the main SPF record.
- **DMARC:** Kit signs with `d=wordonthewater.net` (selectors `cka` / `cka2`). That matches the domain exactly, so DMARC passes through DKIM even under strict `adkim=s` and `p=reject`.
- The DMARC report addresses (`…@dmarc.mailgun.org`, `…@inbox.ondmarc.com`) are Squarespace/Mailgun's, not a person's.

### 4. Test - passed
- Test email sent from a draft broadcast to a Gmail address.
- Landed in the **inbox** (not spam).
- Gmail "Show original": **SPF PASS, DKIM PASS, DMARC PASS**.

---

## Still to do (Kit)

- [ ] **Test a real sign-up.** Sign up through the live form with a fresh address (e.g. a Gmail `+test` alias). Check that the confirmation email arrives and the link works.
- [ ] **Delete the test draft broadcast:** "TEST - domain authentication check (delete me)".
- [ ] Optional: delete the old "SPIKE 1" / "SPIKE 2 - delete me" broadcasts.

---

## When the prayer form gets built (Postmark)

The prayer and contact forms will send transactional mail through **Postmark**. Postmark isn't needed until then.

### Steps
1. **Add the domain in Postmark.** Postmark → Sender Signatures → Add Domain → `wordonthewater.net`.
2. **Copy Postmark's DNS records.** Usually:
   - a **DKIM** TXT record (host like `<something>pm._domainkey`)
   - a **Return-Path** CNAME (host usually `pm-bounces` → `pm.mtasv.net`)
3. **Add them in Squarespace as Custom records,** the same way as the Kit records:
   - Enter only the host part (e.g. `pm-bounces`). Squarespace adds `.wordonthewater.net` itself, so don't type it twice.
   - **Don't** edit or delete anything in the Email Forwarding preset (MX, SPF, DMARC, `krs._domainkey`).
   - **Don't** add a second SPF record. Postmark's Return-Path CNAME handles SPF the same way Kit's `ckespa` does.
   - **Don't** add a second `_dmarc` record.
4. **Verify in Postmark.** Click Verify for both DKIM and Return-Path, and wait for DNS to propagate if needed.
5. **Set the form's from address** to a `@wordonthewater.net` address (e.g. `prayer@` or `hello@`).
6. **Test.** Submit the prayer form so it sends to a Gmail address. In Gmail → ⋮ → Show original, check:
   - SPF: PASS
   - DKIM: PASS, signed by `wordonthewater.net`
   - DMARC: PASS
7. **Check forwarding still works.** Send an email to `prayer@wordonthewater.net` and make sure it still forwards.

### Watch out for
- **Strict DMARC (`adkim=s`, `aspf=s`, `p=reject`).** Any service that sends as `@wordonthewater.net` must sign DKIM with exactly `d=wordonthewater.net`. If not, the mail is **rejected**, not sent to spam. Always run the Show original test before going live.
- **A new sending service needs its own records.** For any other service that will send as the domain, use the same pattern: add its DKIM and return-path records as custom records, verify, then test.
