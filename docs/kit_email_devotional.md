# Weekly devotional email (Kit)

How to turn a published devotional into the weekly Kit email, every week, without breaking an image. Written 2026-11-17. The format of the devotional itself is in [devotional_format.md](devotional_format.md); why it works this way is in [ADR 0008](adr/0008-kit-subscriptions.md); launch-time checks are in Part K of [production_checklist.md](production_checklist.md).

**The idea in one paragraph:** a command creates a **draft** in Kit from the devotional's markdown. It never schedules or sends. You review the draft in Kit, send yourself a test, and schedule it there. Nothing can go out by accident.

## Where the email's images live (and the one rule)

The banner at the top of the email is a plain file in `apps/web/public/email/`, served by the live site at a fixed address:

```
https://wordonthewater.net/email/advent-banner.jpg
```

An email stays in inboxes for years, so **an image address must never change or disappear**:

- Never overwrite, rename, move or delete a banner that an email has used. A new look is a **new file name** (for example `advent-banner-2.jpg`), named in `series.yml`.
- Never point an email at a branch, a preview address or a hashed `/content/` address. That is what broke the first test email: its image lived on a branch that was deleted afterwards.
- Kit has no API to upload images (checked 2026-11-17 in Kit's API index), so the image stays on our site, not in Kit.

## Once per series: add the banner

1. Make the banner: a wide crop (about 16:9) of the series' Night swell art with the subject in the upper third, **1200 px wide**, JPEG, **under 100 KB** (crop recipe in [devotional_format.md](devotional_format.md)).
2. Save it as `apps/web/public/email/<series>-banner.jpg`, lower case, for example `advent-banner.jpg`.
3. In `apps/web/content/series/<series>/series.yml` add `emailBanner: advent-banner.jpg`. A series without `emailBanner` gets an email with no header image.
4. Merge it to `main` and let Vercel deploy. The banner is then public at the address above. (`tests/unit/email-banners.test.ts` checks the file exists, is 1200 px wide and under 100 KB.)

Advent is done: `advent-banner.jpg` is in place and named in its `series.yml`.

## Each week: create the draft

Example: Advent week 2, **The Long Wait**, published Saturday 5 December 2026 (folder `advent-02-the-long-wait`).

1. **Merge the devotional to `main`** and let it deploy. The devotional page and the banner must both be live first.
2. **Make a test draft.** In `apps/web`:
   ```
   pnpm broadcast:devotional advent-02-the-long-wait --tag <test tag id>
   ```
   The command first checks the banner address answers with an image, and **stops with a clear message if it does not** (not merged, not deployed, site not live). Then it creates the draft in Kit and prints its id.
3. **In Kit,** open Broadcasts, then the draft "Devotional: advent-02-the-long-wait". The subject is the devotional's `emailSubject`, the preview text is its `summary`, the sender is `hello@wordonthewater.net`.
4. **Send yourself a test** from the draft and read it on your phone, in light and dark. Check: the banner shows, the scripture panels and quotes look right, the "read it on the website" link opens the devotional, and Kit's unsubscribe line and postal address are at the bottom.
5. **If something is wrong,** fix the markdown (or the banner under a new name), merge, and run the command again. A draft can be deleted in Kit; **a sent email cannot**.
6. **Make the real draft.** Run the same command with `--all` instead of the tag:
   ```
   pnpm broadcast:devotional advent-02-the-long-wait --all
   ```
7. **Schedule it in Kit** for the day, after one last look at the draft. Delete the test draft so only one is left.
8. **Afterwards,** open the sent email once from a real inbox (the banner loads) and leave the banner file untouched.

## What `<test tag id>` is, and where to get it

Kit groups subscribers with **tags**. The command makes you choose an audience on purpose, with no default:

- `--tag <id>` sends only to subscribers who carry that tag. Use it for the test draft.
- `--all` sends to every subscriber. Use it for the real one, and it needs **no id**.

You do **not** look the id up each week. A tag's id never changes, so use the same test tag every time. Ours:

| Tag | Id | Use |
|---|---|---|
| `spike-test` | `25869858` | The test tag. It currently has **no subscribers**, so a test draft aimed at it reaches nobody even if it were scheduled by mistake. You read the email through Kit's "send test", which does not need the tag. |

So the test command is:

```
pnpm broadcast:devotional advent-02-the-long-wait --tag 25869858
```

To see every tag and its id (for example after making a new one), in the repository root:

```
set -a; . ./.env; set +a
curl -s -H "X-Kit-Api-Key: $KIT_API_KEY" https://api.kit.com/v4/tags
```

The `id` and `name` of each tag are in the answer. (Do not paste the key anywhere.)

On 2026-11-17 the Kit account had one subscriber (the test address), so `--all` reached only that one; after launch it reaches everyone who confirmed.

## Before the site is live

The banner address is on `wordonthewater.net`, which is not live until launch (Part G of the production checklist), so the command's banner check fails before then. To **try a draft early**, point the image at a merged `main` file on GitHub, for example:

```
EMAIL_IMAGE_BASE=https://raw.githubusercontent.com/thecodeblock-hendrik/word-on-the-water/main/apps/web/public/email \
  pnpm broadcast:devotional advent-02-the-long-wait --tag 25869858
```

Use that **only for tests, never for an email you will send**: GitHub is not an image host and the address is not ours to keep. Real emails use the default address, after the site is live.

## If the command stops

| Message | Meaning | Fix |
|---|---|---|
| `The email banner at ... answered 404` | The banner is not merged or deployed yet | Merge, wait for the deploy, run again |
| `The email banner could not be reached` | The site address does not answer | Check the site is live; before launch see "Before the site is live" |
| `... is not an image` | The address answers with a page, not a picture | Check the file name in `series.yml` and in `public/email` |
| `Choose the audience: --tag <id> or --all` | No audience given | Add `--tag 25869858` or `--all` |
| `KIT_API_KEY_PREVIEW is not set` | The key is missing from the root `.env` | Add it; `--live` uses `KIT_API_KEY` (both are the same Kit account) |
