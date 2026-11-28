# 0013. Third-party video embeds

Status: accepted 2026-11-28. The plan and build checklist are in [bibleproject.md](../bibleproject.md). Nothing is live until `VIDEOS_ENABLED` is set in Production.

## Context
The site will show BibleProject's four Advent word study videos on `/videos`. BibleProject's terms allow embedding their video streams, with a credit and a link beside each video, no charge or required sign-up, and no copying or changing; they can ask for removal at any time. Until now the only third-party frame on the site is Cloudflare Turnstile, and nothing a visitor reads or watches contacts another company's player. A video player changes that: it adds a new third party (Google, through YouTube), a content security policy change and a privacy disclosure (CLAUDE.md section 14).

## Decision
- **Embed YouTube's player from `https://www.youtube-nocookie.com`**, using videos from BibleProject's official channel. No video file is downloaded or hosted.
- **Tap to play.** Each video shows our own cover. The player is added to the page only after the visitor taps Play, so opening a page sends nothing to Google. No thumbnail, script or preconnect from Google before that.
- **Privacy notice beside the player, before Play**, and Google/YouTube named in the privacy policy. We do not claim the player sets no cookies. We add no video tracking of our own.
- **CSP:** add `https://www.youtube-nocookie.com` to `frame-src` only, and only while videos are on. No change to `script-src`, `connect-src` or `img-src`.
- **Player address:** built only from a video ID in our own content file, checked against the ID's format. Never from the page address or user input. The frame gets `referrerpolicy="strict-origin-when-cross-origin"`, because YouTube needs the referrer to identify the site, and only the permissions playback needs.
- **Credit and link** to BibleProject with every video, and a "Watch on BibleProject" link that also serves when there is no player.
- **One switch:** `VIDEOS_ENABLED=1` shows the pages and links. Unsetting it and redeploying removes them, for example if BibleProject asks.

## Alternatives rejected
- **Links to BibleProject only:** the simplest and sends nothing to Google until the visitor leaves, but videos in the app were wanted. It stays as the fallback on each video.
- **Loading the player with the page:** contacts Google for every visitor, whether or not they watch, and slows the page.
- **YouTube thumbnails as covers:** another request to Google before any choice, an `img-src` change, and their artwork.
- **YouTube's player JavaScript API:** needs a Google script on our page. Removing the frame is enough to stop a video.
- **Hosting or downloading the files:** the terms forbid it.

## Consequences
- Google receives data such as the IP address and device details when a visitor plays a video. Whether tapping Play with the notice is enough consent under POPIA and the GDPR still needs a qualified check before release.
- The pages depend on videos we do not control: one can be removed, replaced or restricted. They are checked before release.
- The player shows YouTube's own controls, logo and "More videos", which can lead a visitor away. We do not cover them.
- The use must stay free and without a required sign-up. Adding donations, advertising or sponsorship means reviewing BibleProject's terms again.
- Without JavaScript there is no player, only the links to BibleProject.
