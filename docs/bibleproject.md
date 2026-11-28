# BibleProject videos

Status: **being built** on `feat/videos-page`, nothing live (2026-11-28). Pages were read on this date; check the terms again before release.

**Decided:** videos are **embedded** on a **new `/videos` page**. The first series is the **Advent word studies** (option A below), laid out as **concept C, a series shelf and then a weekly path**: all four weeks are listed in order, with the current week's open. Mockups: [design/bible_project_advent.html](design/bible_project_advent.html): C first, with its date states and tablet and desktop screens; A and B at the end.

Advent 2026 starts on Sunday 29 November.

## Which series (decided: A)

BibleProject has two Advent sets on the same four themes: hope, peace, joy and love.

| | A. Advent word studies | B. Advent visual podcast |
|---|---|---|
| What it is | Four short videos, each on one Bible word | The 2025 Advent podcast, "reimagined" with illustrations and on-screen words and Scripture. Tim and Jon reflect on the themes |
| Length | 3.5 to 4.5 minutes each, about 16.5 minutes in all | 27 to 36 minutes each, about 2 hours 10 minutes in all |
| Suits | A quick watch on a phone, beside a short devotional | Someone who wants deeper study |
| On each page | Reflection questions and a transcript | The first episode's page has 6 reflection questions and a transcript |
| Age | The 2025 podcast calls the Hope video a "2017 video" | Based on the 2025 podcast |
| Collection | [Advent word studies](https://bibleproject.com/videos/collections/advent/) | [Advent visual podcast](https://bibleproject.com/videos/collections/advent-visual-podcast/) |

The visual podcast pages do not say whether the hosts appear on camera, and no video was watched for this comparison. There is also an [audio-only Advent podcast](https://bibleproject.com/podcasts/series/advent/) (32 to 41 minutes), which is not a candidate for a video page.

**Decided 2026-11-28: A.** It is short, fits a phone and a weekly devotional, and is four small items to check. B is not part of this work; it could be added later as a second series on the same page. Its column is kept as the record of the comparison.

### Episodes

The weeks below are our suggested pairing with the Sundays of Advent.

| Week from | Theme | A. Word study | B. Visual podcast |
|---|---|---|---|
| 29 Nov | Hope | [Yakhal](https://bibleproject.com/videos/yakhal-hope/), 4:15 | [Waiting, Stretching, and Trusting](https://bibleproject.com/videos/visual-podcast-hope/), 27:26 |
| 6 Dec | Peace | [Shalom](https://bibleproject.com/videos/shalom-peace/), 3:30 | [Wholeness, Completion, and Flourishing](https://bibleproject.com/videos/visual-podcast-peace/), 35:57 |
| 13 Dec | Joy | [Chara](https://bibleproject.com/videos/chara-joy/), 4:13 | [Responding to God's Goodness](https://bibleproject.com/videos/visual-podcast-joy/), 35:00 |
| 20 Dec | Love | [Agape](https://bibleproject.com/videos/agape-love/), 4:30 | [God's Gift and Our Calling](https://bibleproject.com/videos/visual-podcast-love/), 31:32 |

## Layout and flow (decided: concept C)

```
/videos  (shelf of series)           /videos/advent  (weekly path)
+----------------------------+       +----------------------------+
| ADVENT cover               |  tap  | (1) Hope             open? |
| This week: Peace           | ----> | (2) Peace  THIS WEEK  open |
| Advent word studies        |       |     [cover + Play]         |
+----------------------------+       |     credit, links, notice  |
                                     | (3) Joy                    |
                                     | (4) Love                   |
                                     +----------------------------+
```

**Why C:** it is ready for more series and reads as a journey through Advent. **What it costs:** an extra tap while there is one series, and the videos are rows in week order, not tiles side by side. The other concepts (A, tiles with a watch page; B, a featured player with a list) stay in the mockup file as the record. The first version of the mockup recommended A, mainly because it was the simpler build while there is only one series.

### The shelf, `/videos`
- Heading, one line of introduction, and one large **Advent** block: our own cover, "4 videos, about 18 minutes", the series name, "By BibleProject", and "This week: <theme>" during Advent. The whole block is one link to `/videos/advent`.
- The mockup's dashed "More series can be added here" box is **not** built.

### The weekly path, `/videos/advent`
- A "Videos" link back to the shelf, then the Advent block with four numbered rows in week order: number, theme, "From <date>", length, and a "This week" label in words.
- A row opens in place to show, in this order: our cover with Play, the credit with the bibleproject.com link and "Watch on BibleProject", the privacy notice (before Play), and one line of introduction.
- **One row open at a time.** Opening another closes the first and **removes its player**, so its sound stops. Tapping the open row closes it.
- Build the rows with `<details>` and `<summary>` sharing one `name`, so they open and close without JavaScript. Check that on the browsers we test. A small script removes the player when its row closes; without JavaScript there is no player, only the links to BibleProject.
- Each week can be linked, as `/videos/advent?week=joy`: the server opens that row and the page scrolls to it. Only the four known names are accepted; anything else behaves as no choice.
- After a row opens, it stays in view: its heading must not jump off screen when the row above closes.

### Which week is open
By UTC date, as devotionals are published (2am in South Africa). A week in the address (`?week=`) wins over this.

| Date | Open | "This week" label |
|---|---|---|
| Before 29 November | Hope | none |
| 29 November to 5 December | Hope | Hope |
| 6 to 12 December | Peace | Peace |
| 13 to 19 December | Joy | Joy |
| 20 to 26 December | Love | Love |
| From 27 December | none | none, on the page and on the shelf |

### Screens
- **Phones from 320px:** as drawn. The player stays at least 200px high inside the block.
- **Tablet and desktop (drawn and approved 2026-11-28):** one centred column of at most 640px on both pages, so the player is never larger than about 640 by 360 and YouTube's fullscreen button gives a larger view. Below `lg`, including a 744px tablet, the header and bar are as on a phone, the bar 440px and centred. From `lg`, the desktop header and no bar. On a short desktop window, an open week pushes the later weeks below the fold.
- **Night swell:** drawn, on phones and desktop.

### Ways in
- A **Videos** link in the hamburger menu after Bible, and in the desktop header.
- The "Audio and video" card under "What's coming" becomes "Advent videos", linking to `/videos`.
- No new bottom bar tab. The bar on both pages is the normal site bar.
- A "This week's video" link after a devotional is drawn as optional and is **not** in the first release.

## Terms of use

Source: [BibleProject Terms of Use](https://bibleproject.com/terms/), headed "Updated October 2026". This is a reading of them, not legal advice.

The permission, in their words: "You are permitted to embed streams of, or links to, any of our Video Content into your own website or mobile application unless and until we instruct you to remove it, but only as long as you comply strictly with these Terms". No prior written permission is needed for this.

| Condition | What we do |
|---|---|
| "You must place a clear and prominent notice, in close proximity to the Video Content" naming BibleProject as author and owner, with a link to www.bibleproject.com | A credit under **each** video: "Video by BibleProject, its author and owner. bibleproject.com". No fixed wording is required |
| No fee, profit, or required action that earns us money indirectly; no commercial use | Videos are free to watch, with no sign-up or subscription required. Review before ever adding donations, ads or sponsors |
| No selling, copying, editing or derivative works | Play their hosted video as it is. Never download it |
| No upload to another server or streaming service | We host no video file |
| Agree to the video host's terms | YouTube's terms apply |
| Do not change the message or take content out of context | Our own titles and introductions stay faithful to the video |
| Do not suggest affiliation or endorsement. No trademark licence (from a summary of that section) | No BibleProject logo, artwork or thumbnails; no wording such as "partner". Naming them in the credit is required |
| Permission ends if the terms are broken or they ask us to remove it | The `VIDEOS_ENABLED` switch hides everything quickly |

**Not verified**
- About the first two thirds of the terms were read word for word. The rest, including the trademark section, was summarised.
- Their two help-centre pages refused access, and the brand guidelines and privacy notice were not read. Read the brand guidelines before using their name in a heading.
- The terms forbid "framing" their services in general, and separately allow embedding video streams. We read this as allowing a video player, not putting their web pages inside ours. Emailing them is optional and would settle it.

## What is required

No database, API, new secret or paid service is expected.

### Video source
- Use **YouTube's player** from `youtube-nocookie.com`, with videos from BibleProject's **official** channel.
- **The four videos (checked 2026-11-28).** The BibleProject pages read showed no YouTube IDs, so they were found by search and then checked on YouTube.

| Theme | YouTube ID | Title on YouTube | Length on YouTube (on BibleProject's site) | Published | Captions listed |
|---|---|---|---|---|---|
| Hope | [`4WYNBjJSYvE`](https://www.youtube.com/watch?v=4WYNBjJSYvE) | Hope | 4:33 (4:15) | 7 Dec 2017 | English and others |
| Peace | [`oLYORLZOaZE`](https://www.youtube.com/watch?v=oLYORLZOaZE) | Shalom - Peace | 3:48 (3:30) | 30 Nov 2017 | English, English automatic and others |
| Joy | [`qvOhQTuD2e0`](https://www.youtube.com/watch?v=qvOhQTuD2e0) | Joy | 4:32 (4:13) | 14 Dec 2017 | English, English automatic and others |
| Love | [`slyevQ1LW7A`](https://www.youtube.com/watch?v=slyevQ1LW7A) | Agape - Love | 4:48 (4:30) | 21 Dec 2017 | English and others |

  - All four belong to channel `UCVfwlh9XpX2Y_tQfjeln9QA`, which is what `youtube.com/@bibleproject` points to. YouTube reported each as public (not unlisted), playable, embeddable, family safe and available in 249 countries, South Africa among them.
  - All four **played** in a `youtube-nocookie.com` player on a temporary local page, in headless desktop Chromium, muted, with our referrer policy.
  - **The longer YouTube lengths:** frames near the time BibleProject's site gives show the end logo; the extra 18 or 19 seconds are credits and a goodbye from the two presenters. The videos show their older logo and `thebibleproject.com`. Leave them as they are; our credit links to bibleproject.com.
  - The player shows its own "More videos" button and YouTube logo. Do not cover or hide them.
  - **Not checked:** nobody has watched them through or listened to them (only a few frames were seen); caption quality; our own content security policy and domain; iPhone and Android.
- Their pages show download links on another video host (MUX). Do not build on those: they are offered as downloads, not as an embed.
- Before release, confirm all four still play: a video can be removed or replaced.

### The pages
- `/videos` and `/videos/advent`, as described in "Layout and flow", with each series stored in a content file (for example `apps/web/content/videos/advent.yml`): its name, introduction and the date after which no week is current; then for each video its week, title, theme, Bible word, length, start date, YouTube ID, BibleProject page and one-line introduction. A unit test on the real file fails CI if a field is missing or badly formed.
- Check each introduction against its video before publishing; those in the mockup are drafts.
- **Consent first:** the banner on both video pages, and no player without Accept (step 8b).
- **Tap to play:** each video shows our own simple cover with a Play button. The player loads only after the tap, so opening a page does not contact YouTube and stays fast.
- Under each player: the credit, a "Watch on BibleProject" link (also the fallback if the player fails or there is no JavaScript), and a short privacy line.
- The shelf names BibleProject too, with a link, since it presents their videos.
- Player: 16:9, but at least 200px high. YouTube [requires at least 200 by 200px](https://developers.google.com/youtube/player_parameters), and 16:9 at 343px wide is only about 193px.
- Each player has a title naming the video; Play is a real button at least 44px. Nothing plays before the tap. Nothing records what was watched.
- `DEVOTIONAL_TODAY` previews another day.
- Behind `VIDEOS_ENABLED`: off means no pages, links or security change visible to visitors. Add both pages to the sitemap when on.

**Desktop header** (measured on the live site, 28 November, with copied links added in the test browser): a Videos link alone fits in one row at 1024px. With the planned Prayer link as well, the page is 29px too wide at 1024px, and the row grows taller at 1280px. With "About" removed (the logo already goes home), both fitted at 1024 and 1280px. That was without Prayer's badge. Removing "About" is a **proposal**, only needed when Prayer ships.

### Security
- Content security policy (`apps/web/src/lib/csp.ts`): add `https://www.youtube-nocookie.com` to `frame-src`, which now allows only Turnstile. With our own covers, `img-src`, `script-src` and `connect-src` should not need to change. Prove it in a browser test.
- YouTube [needs the referrer](https://developers.google.com/youtube/terms/required-minimum-functionality) to identify our site. Our `Referrer-Policy` (`strict-origin-when-cross-origin`) already sends it; also set `referrerpolicy` on the player. A missing referrer is a reported cause of "error 153".
- Build the player address only from a checked video ID in our own file, never from the page address or user input.
- Allow only what the player needs (fullscreen, picture in picture, playing after the tap).

### Privacy
- Playing a video sends data (such as the visitor's IP address and device details) to Google. Say so beside the player and add Google/YouTube to `docs/privacy.md` and `apps/web/src/content/privacy.ts`.
- [Privacy-enhanced mode](https://support.google.com/youtube/answer/171780?expand=PrivacyEnhancedMode) stops these views personalising YouTube. We did **not** confirm that it sets no cookies, so do not claim that.
- **(Hendrik)** Have someone qualified confirm that tapping Play, with the notice, is enough under POPIA and the GDPR.
- YouTube's own terms also ask for certain wording and links in the privacy policy (step 8 and [privacy.md](privacy.md)).
- We add no video tracking of our own.

### Records
- ADR 0013: third-party video embeds (a new third party and a security policy change).
- Threat model rows: third-party content in a frame, data sent to Google, a removed or replaced video.
- `CLAUDE.md` (sections 4, 6.2 and 13) and `docs/PLAN.md`.

## Build checklist

One branch (for example `feat/videos-page`), tests first, one commit per step, one pull request.

- [x] 0. **(Hendrik)** Series A and layout C chosen (2026-11-28).
- [x] 1. Collect and check the four YouTube IDs (2026-11-28, results under "Video source").
- [ ] 1a. **(Hendrik)** Watch all four through, with sound and English captions.
- [x] 2. [ADR 0013](adr/0013-third-party-video-embeds.md) and threat model rows V1 to V6.
- [x] 3. `VIDEOS_ENABLED`, off by default (`apps/web/src/lib/videos/flag.ts`).
- [x] 4. Content file, loader and check (`apps/web/content/videos/advent.yml`, `src/lib/videos`; the check is a unit test on the real file, so CI fails). Tests: a missing field or badly formed ID fails; the open week and label on the day before Advent, on each Sunday and the day before it, and from 27 December; a known and an unknown `?week=`.
- [x] 5. The shelf and the weekly path, with covers, credits, links and notice. Tests: the shelf links to the path; four rows in week order; the right row open and labelled; a credit with every video; no player before a tap; rows open and close, one at a time, without JavaScript; the column is centred and no wider than 640px at 744, 1024 and 1280px.
- [x] 6. Tap to play (the Play button comes with the player, so there is never a button that does nothing), scrolling to a `?week=` row, keeping an opened row in view, and the `frame-src` change. Tests: the player has the right address, title and referrer policy and is at least 200px high at 320px wide; closing a row or opening another removes the player; no policy errors; no request to Google before the tap.
  - Checked 2026-11-28 on a local build with the real player, headless desktop Chromium, muted, 375px: no request to Google before the tap, all four played, no policy messages. After a tap the browser contacted `www.youtube-nocookie.com`, `www.google.com`, `googlevideo.com`, `i.ytimg.com`, `yt3.ggpht.com` and `jnn-pa.googleapis.com`: step 8 should name Google as well as YouTube. Not checked: sound, captions, phones, a preview or the live domain.
- [x] 7. Menu, header and card links, sitemap. Test that the header stays one row at 1024px. With the flag off, nothing changes.
  - 2026-11-28: with the Bible and chat on too, the header was one row at 1024px in desktop Chromium and WebKit. The mockup's "New" label on the menu link is not built: this list never asked for it, and it would need its own date rule.
- [x] 8. Privacy policy text, shown only while videos are on, with its own date. The notice beside Play now names Google.
  - 2026-11-28: Hendrik read the new text, and chose to add "By playing, you agree to the YouTube Terms and our Privacy policy" to the notice beside Play. The policy date is 28 November 2026.
  - 2026-11-28: YouTube says its API terms and developer policies apply to the embedded player, which this plan had not covered. The text now includes what they ask a privacy policy to say and link; [privacy.md](privacy.md) lists each point. They also say users must agree to the privacy policy before using the features; the line beside Play is our answer, with no separate tick or button.
- [ ] 8a. **(Hendrik)** Get a qualified check: consent under POPIA and the GDPR, and whether the line beside Play is enough for the "agree before access" rule.
- [x] 8b. Cookie banner, built 2026-11-28. **Decided 2026-11-28 (Hendrik):** on the video pages only, with the recommendations below. **Placement A, in the page, and its wording approved 2026-11-28:** [design/cookie_banner_videos.html](design/cookie_banner_videos.html) (B, floating above the bar, was not chosen).
  - Shown on `/videos` and `/videos/advent`, only while videos are on. Decline and Accept look alike, with a privacy policy link.
  - Without Accept the pages and BibleProject links work; Play says YouTube is turned off and offers to allow it. Accept does not load anything by itself: the player still waits for Play.
  - The choice is kept for six months in a cookie of our own and can be changed with "Cookie settings" in the footer of the video pages.
  - It must not cover Play or the bottom bar.
  - Found at build: the "YouTube is off" panel is taller than the cover, and when Play was pressed low on a phone its buttons were left under the bottom bar. The panel now scrolls itself clear; a browser test covers it.
  - The video pages have no sign-up form, so they do not load Cloudflare Turnstile. Whether Turnstile sets cookies where it does load was not settled by the Cloudflare pages read on 2026-11-28; it is outside this banner.
  - The privacy policy describes the banner and its cookie while videos are on, and no longer says "no cookie banner is needed" with videos off.
- [ ] 9. `make lint typecheck test e2e`, accessibility check, Lighthouse and the landing page JavaScript budget (about 3.5 KB was free on 28 November).
- [ ] 10. On a preview with the flag on, **(Hendrik)** play all four on an iPhone (browser and installed app) and an Android phone: sound, fullscreen and captions. Check each video's captions; do not promise them before this.
- [ ] 11. **(Hendrik)** Read the terms again (BibleProject's and YouTube's), check the privacy policy date, merge, set `VIDEOS_ENABLED` in Production, and promote.

**Turning it off:** unset `VIDEOS_ENABLED` and redeploy. Do this at once if BibleProject asks.

## Decisions (2026-11-28)

| # | Decision |
|---|---|
| 1 | Embed the videos, rather than only linking to them |
| 2 | On a new `/videos` page |
| 3 | Series A, the Advent word studies |
| 4 | All four at once. ~~The current week's first~~: replaced by 5 |
| 5 | Layout C: a series shelf, then a weekly path in week order with the current week open |

**Week one:** Advent starts on 29 November, before this can be built. Release when the checks pass. If something is needed sooner, a credited link to the Hope video is allowed by the same terms.

No questions are open. Watching the videos (step 1a) and the privacy check (step 8) are still to do.

## Sources

- [BibleProject Terms of Use](https://bibleproject.com/terms/)
- [Advent word studies](https://bibleproject.com/videos/collections/advent/) and [Advent visual podcast](https://bibleproject.com/videos/collections/advent-visual-podcast/)
- [Advent podcast](https://bibleproject.com/podcasts/series/advent/)
- YouTube: [player parameters](https://developers.google.com/youtube/player_parameters), [required minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality), [embedding help](https://support.google.com/youtube/answer/171780?expand=PrivacyEnhancedMode)
