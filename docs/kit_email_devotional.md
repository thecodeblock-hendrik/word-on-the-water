# Weekly devotional email (Kit)

Everything about the weekly email in one place: how it works, what to do each week, how to test it, and the rules that keep its images from breaking. Written 2026-11-17. Related: the devotional file format is in [devotional_format.md](devotional_format.md), the design decisions and what Kit was proven to do are in [ADR 0008](adr/0008-kit-subscriptions.md), and the launch-time checks are in Part K of [production_checklist.md](production_checklist.md).

---

## 1. The idea in one minute

```
devotional.md  --(pnpm broadcast:devotional)-->  DRAFT in Kit  --(you review, test, schedule in Kit)-->  email sent
   (repo)            runs on YOUR machine         never sent by the command          Kit sends, adds unsubscribe line
```

- The email is made from the **same markdown file as the website page**, so the wording is written once.
- The command only ever creates a **draft** in Kit. It never schedules and never sends. A person reviews the draft, tests it, and schedules it inside Kit. Nothing can go out by accident.
- Kit owns the subscriber list, the unsubscribe link, the postal address in the footer and the actual sending. We only supply the content.
- The command runs on **your own computer** (TypeScript in `apps/web`, because the devotional files and their parser live there). It is not part of the website and does not run on Vercel. Your Kit key stays in the root `.env`.

## 2. What the command does, step by step

`pnpm broadcast:devotional <folder> --tag <id>|--all` (code: `apps/web/scripts/broadcast-devotional.mts`, `apps/web/src/lib/devotionals/kit-broadcast.ts`):

1. Reads the devotional folder and its series (`content/series/<series>/series.yml`).
2. Builds the series header: the line "Advent · 2 of 5" and, if the series has an `emailBanner`, the banner image address.
3. **Checks the banner address** answers with an image (a HEAD request). If not, it stops here with a clear message and creates nothing (see section 9).
4. Renders the email HTML (section 3).
5. Sends one request, `POST https://api.kit.com/v4/broadcasts`, with the key from `.env`, and prints the new draft's id.

How the devotional becomes Kit fields:

| Kit field | Comes from |
|---|---|
| `subject` | `emailSubject` in the devotional's front matter (up to 80 characters) |
| `preview_text` | `summary` in the front matter (up to 200 characters), the line shown next to the subject in an inbox |
| `description` | `Devotional: <folder name>`, the internal name you see in Kit's list |
| `content` | The rendered HTML (section 3) |
| `email_address` (sender) | `hello@wordonthewater.net` |
| `public` | `false` (not published on a Kit web page) |
| `send_at` | `null`, so it stays a **draft** |
| `subscriber_filter` (audience) | `--tag <id>` (only people with that tag) or `--all` (everyone). There is **no default**: you must choose |

Rules built into the command: every field is always sent (a later edit through the API resets any field it leaves out), and errors report only the HTTP status, never your key or the email text.

## 3. What the email looks like

The Night swell (dark) look, built as a table with inline styles, because that is what Gmail and Outlook honour. Top to bottom:

1. **Series banner image** (if the series has one), then the series line ("Advent · 2 of 5") and the title.
2. **Conditions**: the scripture for the week on raised panels.
3. **The Lineup** and **The Word**: the teaching.
4. **Paddle Out** on the deeper panel.
5. **Pray**.
6. **Go Deeper** (only if the devotional has it).
7. A "Read it on the website" link to `<SITE_URL>/devotionals/<folder>`, and the ESV copyright notice.
8. Below that, **added by Kit on a white background**: the unsubscribe and update-profile links, the postal address (PO Box 6055, Port Elizabeth, Eastern Cape 6001) and, on the free plan, a "Built with Kit" badge. We never write these ourselves.

Fonts fall back to system fonts. Block quotes lose their styling in Kit's "Text only" template, so quotes are styled inline. Not yet read in every mail app: see section 6 and Part K of the production checklist.

## 4. Images: the one rule, and where they live

An email stays in inboxes for years, so **an image address in an email must never change or disappear.**

The banner is a plain file in `apps/web/public/email/`, served by the live site at a fixed address:

```
https://wordonthewater.net/email/advent-banner.jpg
```

- **Never** overwrite, rename, move or delete a banner an email has used. A new look is a **new file name** (for example `advent-banner-2.jpg`), named in `series.yml`.
- **Never** point an email at a branch, a preview address or a hashed `/content/` address. The first test email lost its image because it pointed at a branch that was deleted afterwards.
- Kit's API has no image upload (checked in Kit's API index on 2026-11-17), so images stay on our site, not in Kit.
- Why this address and not another: a plain static file under our own domain is served by Vercel's network, needs no new account, and is not tied to GitHub or to any branch. The `/content/` route is deliberately not used because its address contains a hash that changes with the file, which would break old emails if the image were ever replaced.

### Once per series: add the banner

1. Make the banner: a wide crop (about 16:9) of the series' Night swell art, subject in the upper third, **1200 px wide**, JPEG, **under 100 KB**. The crop recipe is in [devotional_format.md](devotional_format.md).
2. Save it as `apps/web/public/email/<series>-banner.jpg`, lower case, for example `advent-banner.jpg`.
3. In `apps/web/content/series/<series>/series.yml` add `emailBanner: advent-banner.jpg`. A series with no `emailBanner` gets an email with no header image.
4. Merge to `main` and let Vercel deploy. The banner is then public at the address above. A unit test (`tests/unit/email-banners.test.ts`) fails if the file is missing, is not 1200 px wide or is over 100 KB.

Advent is done: `advent-banner.jpg` is in `public/email` and named in its `series.yml`.

## 5. One-time setup (before the first real send)

Most of this is also in Part K of [production_checklist.md](production_checklist.md); tick it there.

- **Keys** in the root `.env` (never in the repo, chat or Vercel): `KIT_API_KEY_PREVIEW` is used by default; add `--live` to use `KIT_API_KEY`. Both belong to the **same Kit account**, so a draft appears in your live Kit account either way. Run `pnpm install` once in `apps/web`.
- **Sending domain:** Kit's DKIM for `wordonthewater.net` was set on 2026-11-15 (Part E). Because the domain publishes DMARC `p=reject`, mail from `hello@` is only accepted by inboxes when it is authenticated. Delivery from `hello@` is **not yet proven end to end**: see the delivery test in section 6.
- **Kit account settings:** timezone Harare (UTC+2, set 2026-11-14), default sender `hello@wordonthewater.net`, and the postal address Kit prints in the footer.
- **A test tag** that only your own test subscriber carries: `spike-test`, id 25869858, already set up (section 7).
- **Clean up the spike leftovers** in Kit before real subscribers arrive, so the first `--all` goes only to real people: extra test subscribers (keep your own address, which carries the test tag), the empty "Imported November 14th…" tag (**keep the `spike-test` tag**, it is the test audience) and the old sent test broadcasts (the API cannot delete a sent broadcast; Part K says to clear them in the Kit dashboard). Listed in Part K.

## 6. Each week, step by step

Worked example: **Advent week 2, The Long Wait**, folder `advent-02-the-long-wait`, published Saturday 5 December 2026.

**The five Advent emails** (subject = `emailSubject`, taken from each devotional's front matter):

| Week | Folder | Published (UTC date) | Subject |
|---|---|---|---|
| 1 | `advent-01-more-than-watchmen` | Sat 28 Nov 2026 (launch day) | Waiting for first light |
| 2 | `advent-02-the-long-wait` | Sat 5 Dec | I'll believe it when I see it |
| 3 | `advent-03-a-quiet-mans-yes` | Sat 12 Dec | He never said a word |
| 4 | `advent-04-shepherds-on-the-night-shift` | Sat 19 Dec | Nobody throws a party for the night shift |
| 5 | `advent-05-the-word-became-flesh` | Sat 26 Dec | He got in the water |

Steps:

1. **Merge the devotional to `main`** and wait for the Vercel deploy. The devotional page and the banner must both be live before the next step. (The email itself can be made days earlier; only the website link needs the page, and the page appears on its publish date.)
2. **Create a test draft.** In `apps/web`:
   ```
   pnpm broadcast:devotional advent-02-the-long-wait --tag 25869858
   ```
   (`25869858` is the test tag, section 7.) It checks the banner, creates the draft, and prints `Draft <id> created ...`. It also prints that nothing was scheduled or sent.
3. **Open the draft in Kit:** Broadcasts, then "Devotional: advent-02-the-long-wait". Check the subject, the preview text and the sender.
4. **Test it.** See "Testing" below. Read it **on your phone**, in light and dark mode, and check: the banner shows, the dark panels hold, quotes and Paddle Out are styled, dashes, quotes and the © are correct, "Read it on the website" opens the devotional, and Kit's unsubscribe line and postal address are at the bottom.
5. **If anything is wrong,** fix the markdown (or add a new banner file), merge, and run the command again. **A draft can be deleted in Kit. A sent email cannot be taken back from readers' inboxes**, and the API refuses to delete one (Kit answers "Broadcast has already been sent"); treat every send as permanent.
6. **Create the real draft:**
   ```
   pnpm broadcast:devotional advent-02-the-long-wait --all
   ```
7. **Schedule it in Kit** for the publish day. Choose a time **after 02:00 Harare time** (the page goes live at 00:00 UTC, which is 02:00 in Harare), so the website link works when readers tap it. If the test draft was never sent, delete it so only one is left.
8. **Afterwards:** open the sent email once from a real inbox (the banner loads), and look at Kit's report (recipients, opens, unsubscribes, bounces, complaints). **Leave the banner file untouched.**

### Testing

Be clear about what has and has not been proven:

- **Proven (2026-11-14): a real send to a tag only you carry.** Make the draft with `--tag 25869858`, then send or schedule that draft in Kit. Only your own address carries the tag, so only you receive it (in your Gmail inbox). The catch: it is a real send, so it stays in Kit as a sent broadcast forever. Use it for the **first** test and for anything you need to see exactly as a subscriber would.
- **Not verified: Kit's own "send test email" button** on the draft screen. Kit's API has no test send, and the button has not been confirmed in our account. If your draft screen offers it, use it for the weekly test: it avoids sending a real broadcast. If it does not, use the tag method.
- **Delivery test (once, before launch, Part K):** send a tag-limited draft to your Gmail, open "Show original" and confirm **SPF, DKIM and DMARC all pass** and that it lands in the inbox and not spam. Until this is done, delivery from `hello@` is unproven (the spike had to use a Gmail sender and landed in spam).
- **Mail apps:** read it in the Mail app and the Gmail app, light and dark, and in Outlook if you can.

## 7. What a tag id is, and where to get it

Kit groups subscribers with **tags**. The command makes you choose an audience on purpose:

- `--tag <id>` sends only to people carrying that tag. Use it for tests.
- `--all` sends to every subscriber. Use it for the real send. It needs **no id**.

You do **not** look the id up each week: a tag's id never changes, so use the same test tag, 25869858, every time.

**The test tag (set up 2026-11-17):** `spike-test`, id **25869858**. As of 2026-11-21 a fresh Gmail alias of your address (`+kittest`) carries it, not your main address: that one unsubscribed and Kit cannot re-subscribe it through the API (ADR 0008), so it stays `cancelled`. The alias is the one active subscriber in the account, so a draft aimed at the tag goes to you and nobody else. This is the permanent way to send test devotionals to your own inbox:

```
pnpm broadcast:devotional advent-02-the-long-wait --tag 25869858
```

Checked 2026-11-17 from the subscriber's side: the subscriber is active and its tags are exactly `spike-test`. The other tag in the account, `Imported November 14th, 2026 at 11:41 AM` (id `25869740`), is an empty import leftover and is not used.

Keep these in mind:

- **Only ever give this tag to people you want to receive test emails.** If a real subscriber is tagged by mistake they get the tests.
- **Do not delete the tag** during the cleanup in section 5. You may rename it in Kit (for example to `devotional-test`); the id stays the same, so nothing else changes.
- Kit's own list of a tag's subscribers says **0** for this tag even though you carry it (the same quirk found in the spike, ADR 0008). Trust the subscriber's own page in Kit, not that list.

**List every tag and its id** (from the repository root; this only reads, and does not show the key):

```
set -a; . ./.env; set +a
curl -s -H "X-Kit-Api-Key: $KIT_API_KEY_PREVIEW" https://api.kit.com/v4/tags
```

Each tag has an `id` and a `name`. Note that Kit's list of a tag's subscribers can come back empty even when the subscriber's own tag list shows the tag (found in the spike, ADR 0008), so to see who carries a tag trust the subscriber's own page in Kit. On 2026-11-17 the account had **one subscriber in total**, so `--all` reaches only that address today; after launch it reaches everyone who confirmed.

## 8. Before the site is live

The banner address is on `wordonthewater.net`, which is not live until launch (Part G of the production checklist). Today that domain still shows the old Squarespace page, so the command's banner check answers "not an image" and refuses to make a draft. To **try a draft early**, point the image at a banner that is already merged to `main` on GitHub:

```
EMAIL_IMAGE_BASE=https://raw.githubusercontent.com/thecodeblock-hendrik/word-on-the-water/main/apps/web/public/email \
  pnpm broadcast:devotional advent-02-the-long-wait --tag 25869858
```

Use this **only for tests, never for an email you will send**: GitHub is not an image host and that address is not ours to keep. (It also only works once `public/email/advent-banner.jpg` is merged to `main`.) Real emails use the default address, after the site is live.

## 9. If the command stops

| Message | Meaning | Fix |
|---|---|---|
| `The email banner at ... answered 404` | The banner is not merged or deployed yet | Merge, wait for the deploy, run again |
| `The email banner could not be reached` | The address does not answer at all | Check the site is live; before launch see section 8 |
| `... is not an image` | The address answers with a page, not a picture. Until launch this is what `wordonthewater.net` gives (the old Squarespace page, seen 2026-11-17) | After launch, check the file name in `series.yml` and in `public/email`. Before launch see section 8 |
| `Choose the audience: --tag <id> or --all` | No audience given | Add `--tag <id>` or `--all` |
| `--tag must be a whole number` | The id is not a number | Use the number from the tag list |
| `Give --tag <id> or --all, not both` | Both were given | Give one |
| `KIT_API_KEY_PREVIEW is not set` | The key is missing from the root `.env` | Add it. `--live` uses `KIT_API_KEY` instead |
| `No devotional folder named ...` | The folder name is wrong | Use the exact folder name from `content/devotionals` |
| `Kit rejected the draft with status ...` | Kit refused the request | Check the key and the account plan; status 429 means wait a minute |
| `Warning: ... has no emailBanner` | The series has no banner, so the email has no header image | Add a banner (section 4) or continue without |

## 10. The rules, in one list

- The command only makes drafts. You schedule in Kit.
- Always choose an audience: `--tag 25869858` for tests, `--all` for the real send.
- An email image address never changes: no branch, no preview address, no hash, no overwrite. New banner means a new file name.
- Never use `EMAIL_IMAGE_BASE` for an email you will send.
- A sent email cannot be taken back. Test first, on your phone.
- Schedule after 02:00 Harare time on the publish day.
- Keys live in the root `.env` only.

## 11. Per-week checklist (copy for each issue)

- [ ] Devotional merged and deployed; banner address loads in a browser
- [ ] Test draft made with `--tag 25869858`; subject, preview text and sender right
- [ ] Test read on a phone, light and dark: banner, panels, quotes, link, unsubscribe line
- [ ] Real draft made with `--all`; test draft deleted if it was not sent
- [ ] Scheduled in Kit after 02:00 Harare on the publish day
- [ ] After sending: opened once from a real inbox; Kit report checked (opens, unsubscribes, bounces, complaints)

## 12. Reference

| Thing | Where / value |
|---|---|
| Command | `pnpm broadcast:devotional <folder> --tag <id>` or `--all` (run in `apps/web`) |
| Flags | `--tag <id>`, `--all` (one is required), `--live` (use `KIT_API_KEY` instead of `KIT_API_KEY_PREVIEW`) |
| Environment | `KIT_API_KEY_PREVIEW`, `KIT_API_KEY` (root `.env`); optional `SITE_URL` (the "Read it on the website" link, default `https://wordonthewater.net`); optional `EMAIL_IMAGE_BASE` (testing only) |
| Banner | `apps/web/public/email/<series>-banner.jpg`, named by `emailBanner` in `content/series/<series>/series.yml` |
| Banner address | `https://wordonthewater.net/email/<emailBanner>` |
| Code | `apps/web/scripts/broadcast-devotional.mts`, `apps/web/src/lib/devotionals/kit-broadcast.ts` (draft and banner check), `apps/web/src/lib/devotionals/email.ts` (the HTML) |
| Tests | `tests/unit/kit-broadcast.test.ts`, `devotional-email.test.ts`, `email-banners.test.ts`, `series.test.ts` |
| Sender | `hello@wordonthewater.net` |
| Kit API | `POST https://api.kit.com/v4/broadcasts`, header `X-Kit-Api-Key` |
| Later | The Python `KitClient.create_broadcast` has the same rules, for when the Phase 2 admin screen makes broadcasts from the API |
