# Bible feature (read the Bible on the site)

Plan for a simple in-site Bible reader: pick a Bible version, a book, a chapter and optionally verses; previous and next chapter buttons on mobile; a version picker.

Bibles, in the order we build them:

1. **BSB** (Berean Standard Bible): first and default. Public domain, stored on our side.
2. **WEB** (World English Bible): second. Public domain, stored on our side.
3. **ESV**: third, from the ESV API (Crossway) under its free terms. Waits for Crossway's approval of our API application (applied 2026-11-07).

BSB and WEB do not depend on the ESV approval, so the reader ships first with those two. The ESV appears in the version picker as "Coming soon" until its key is live.

Mockups: [design/bible_mockups.html](design/bible_mockups.html) (mobile light and dark, version picker, picker steps, quick switch, open mobile menu, desktop). Open it in a browser.

Sources read 2026-11-07: api.esv.org (terms and docs), crossway.org/permissions, berean.bible (downloads, licensing, terms), ebible.org/web and its details page, github.com/seven1m/open-bibles. Terms can change: re-read the relevant terms before building each source and before launch.

The site stays free ([site-is-free decision in CLAUDE.md](../CLAUDE.md)).

---

## 1. What we are building

| Need | Answer |
|---|---|
| Choose a Bible | Version picker: BSB, WEB, ESV (coming soon). Step 1 of the picker, plus a one-tap version chip in the reader header that opens a quick-switch sheet |
| Choose book, chapter, verses | Picker steps 2 to 4. Verses are optional (empty = whole chapter) |
| Mobile | Previous and next chapter buttons at the bottom, in thumb reach, naming the target ("← John 2", "John 4 →"). Optional swipe |
| Desktop | Permanent left column picker with a version control at the top; left and right arrow keys change chapter |
| Simple | One page, one URL per passage, no accounts, no search in the first release. One version at a time (no parallel view in the first release) |

URLs (shareable, no JavaScript needed to read):

```
/bible                          -> redirects to /bible/bsb/john/1
/bible/bsb/john/3               whole chapter, BSB
/bible/web/john/3?v=16-18       verse range (one chapter only), WEB
/bible/esv/john/3               ESV (404 until the ESV is enabled)
```

Changing the version keeps the book, chapter and verses: the link only swaps the version in the URL. If a verse does not exist in the other version (numbering differences), show the whole chapter.

---

## 2. The Bibles and their rules

| | BSB | WEB | ESV |
|---|---|---|---|
| Licence | Public domain (CC0), dedicated 30 April 2023 | Public domain | Crossway free terms, non-commercial, API key |
| Source | Our files (USFM from bereanbible.com) | Our files (USFM from eBible.org) | `api.esv.org` at request time |
| Limits | None | None | 500 verses or half a book per page, API rate limits, 500-verse storage cap |
| Notice | Suggested, not required: "The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, OpenBible.com, and the Berean Bible Translation Committee. This text of God's Word has been dedicated to the public domain." Verify the wording against berean.bible/terms.htm before use | None required. Say "World English Bible (WEB), public domain" | Full Crossway notice plus "(ESV)" per quotation and a link to www.esv.org (already in the footer) |
| Name rule | Do not call a modified text "Berean". We do not modify it | "World English Bible" is a trademark of eBible.org: if we change the words, we may not call it the WEB. We do not modify the words | "ESV" and "English Standard Version" are Crossway trademarks |
| Status | Build now | Build now | Blocked on API approval |

Showing other Bibles next to the ESV: none of the ESV pages I read (api.esv.org, crossway.org/permissions, esv.org terms and translation page) restrict other translations on the same site, page or app. The permissions page even gives notice wording for pages that quote several translations ("Unless otherwise indicated, all Scripture quotations are from the ESV..." or "Scripture quotations marked (ESV) are from..."). So a version picker is allowed on the face of the published terms. Points to keep in mind:
- The ESV rules (limits, caching, notice) apply only to ESV pages. BSB and WEB pages are not limited by them.
- The ESV pages do not say whether other translations on the same page count towards the 500-verse and 25% limits. That is why the first release shows one version per page. A parallel view (two versions side by side) needs a check with Crossway first.
- The ESV is non-commercial only. That is already how the site works.
- Because the footer carries the full ESV notice on every page, no extra notice is needed on BSB and WEB pages for compliance. We still show a short "Berean Standard Bible, public domain" credit line there, because it is clearer to readers.
- This is my reading of the published text, not legal advice. If anything is unclear, ask Crossway (licensing@crossway.org).

---

## 3. Public-domain data (BSB and WEB)

Both are available as USFM zips. Neither site offers verse-per-row JSON or CSV, so we convert once, ourselves.

| | BSB | WEB |
|---|---|---|
| Files | `https://bereanbible.com/bsb_usfm.zip` (also USX, USJ and plain text) | `https://eBible.org/Scriptures/eng-web_usfm.zip` (also USFX and HTML) |
| Edition | BSB, "Current, updated to 3rd Printing" | Pick the 66-book "Update" edition (US spelling, uses LORD for God's name). The "Classic" default uses "Yahweh". Decision in step B2 |

Plan:
- A build script `pnpm build:bible` parses USFM and writes one JSON file per chapter in a small structure of our own: `{ version, book, chapter, sections: [{ heading?, paragraphs: [{ poetry?: bool, verses: [{ n, text }] }] }] }`. Output goes to `apps/web/content/bibles/<version>/<book>/<chapter>.json`, committed to the repo (public domain, so committing is fine; the 500-verse storage cap applies only to the ESV).
- The script is a repeatable, tested step. We never edit the words by hand.
- A spike first (step B2): download both zips, parse one book, check headings, paragraph and poetry markup, footnote markers, and numbering differences between the two (Psalm titles, verse splits). Record findings in this file.
- Read at request time on the server with `node:fs`, no database needed. Files are traced into the Vercel function via `outputFileTracingIncludes`. Size is roughly 4 to 5 MB of text per version; confirm in the spike.
- Verse numbering: store the version's own numbering. The book data table (4.6) holds the ESV or KJV-style counts for the picker; per-version counts are read from the imported data, so each version's steppers are exact.

---

## 4. Design decisions

### 4.1 One interface, three sources

```
BibleSource.getPassage({ version, book, chapter, verses? }) -> Passage
```

- `LocalSource` (BSB, WEB): reads the imported JSON.
- `EsvSource` (ESV): calls the ESV API, sanitises, caches (section 5, step B7).
- A version registry (`bible-versions.ts`): id, name, short name, source, notice, `enabled` flag. The ESV entry is `enabled: false` until step B7 is done and the key is live. The picker shows disabled versions as "Coming soon".

The reader renders one `Passage` shape regardless of source, so the UI has no ESV special cases except the notice.

### 4.2 Where the ESV code runs

Next.js server directly, in an isolated `lib/esv/` module. It is a read-only third-party API with a server-held key and no visitor data, so a FastAPI hop adds a failure point and no security. If a native app is built (Phase 2 gate), move the ESV client behind FastAPI then.

### 4.3 ESV details (applies to step B7 only)

Base `https://api.esv.org/v3/passage/`, header `Authorization: Token <API_KEY>`.

| Endpoint | Use |
|---|---|
| `html/` | The one we use. JSON; `passages[0]` is HTML with `h2`, `p`, `b.verse-num` (id like `v43011035-1`), poetry, and a closing `(ESV)` link |
| `text/` | Plain text; not used |
| `search/` | Later: `q`, `page-size` (default 20, max 100), `page` |
| `audio/` | Later: redirect to MP3; audio terms not stated, ask Crossway |

Options: headings, subheadings and verse numbers on; footnotes, cross-references and the audio link off; `include-short-copyright` on (adds "(ESV)"); `wrapping-div` on. Response also has `canonical`, `parsed`, and `passage_meta` (`chapter_start`, `chapter_end`, `prev_chapter`, `next_chapter` as verse-id ranges; ids are `BBCCCVVV`). Error codes and body shapes are not documented: treat any non-200 as unavailable.

Convert the sanitised HTML into our `Passage` shape so the reader renders it like the other two. Sanitise with an allow-list (tags `h2 h3 h4 p span b i sup br div a`, attributes `class id`, `href` only to `www.esv.org`); no `inline-styles` (the CSP forbids inline styles). Text is unaltered.

ESV rules (R-numbers are used in the plan below):

| # | Rule |
|---|---|
| R1 | Non-commercial only: no charge, donations, advertising or sponsorship. A change needs a Crossway license first |
| R2 | At most 500 verses or half a book (whichever is less) per query and per page: one chapter at most (Psalm 119 is 176 verses) |
| R3 | Store or cache at most 500 verses locally; clear caches regularly. Cache in memory only (400 verses total, 1 hour), `fetch` with `cache: "no-store"`, never in the database, repo, Redis, disk or CDN |
| R4 | Rate limits: 5,000 queries a day, 1,000 an hour, 60 a minute; beyond that the app is throttled |
| R5 | Each quotation includes "ESV"; each page links to www.esv.org; the standard notice is on the site (the footer has it) |
| R6 | Do not alter the words. Headings, footnotes, cross-references and verse numbers may be omitted. Omissions inside a verse are marked with an ellipsis |
| R7 | Never publish the API key: server-only module, Sensitive Vercel variable, never `NEXT_PUBLIC_` |
| R8 | No download or bulk copy feature (users may not copy more than 500 verses or half a book) |
| R9 | No Creative Commons licence on pages carrying the ESV; no translation of the ESV |
| R10 | Use consistent with historic Christian doctrine; nothing illegal or immoral on the site |
| R11 | Crossway can cancel access and gives no uptime guarantee: the page degrades to a link to the passage on esv.org |
| R12 | Licenses go to organisations. Offline use, a native app with the full text, or other limits need a license (https://crosswaygnp.formstack.com/forms/esv_digital_licensing_proposal) |

Rate protection: global counters (not text) per minute, hour and day in Upstash Redis; at 80% serve only cached passages; at 100% show the fallback. A Vercel Firewall rate-limit rule on `/bible/esv/*` per IP.

Fallback: "The ESV text is not available right now. Read John 3 on esv.org", linking to `https://www.esv.org/John+3/`.

### 4.4 Version picker (see mockups)

Best-practice choices:
- **Two places, one source of truth.** Step 1 of the picker lists the versions as large radio cards (name, one-line description, licence note). A chip in the reader header (`BSB ▾`) opens a quick-switch sheet for changing version without walking through the steps. Both use the same component.
- **Radio semantics.** `role="radiogroup"`, one selected, arrow keys move, the selected card has a tick and a heading, not colour alone.
- **Plain language.** "Berean Standard Bible (BSB), modern English, easy to read", "World English Bible (WEB), modern English, classic style", "English Standard Version (ESV), coming soon".
- **Disabled state explained.** The ESV card is not hidden: it shows "Coming soon" with `aria-disabled`, so the plan is visible and nothing looks broken.
- **Keeps your place.** Switching the version keeps book, chapter and verses (URL swap).
- **Remembered.** The last chosen version is kept in `localStorage` as a convenience (the URL still decides what renders; no cookie banner needed).
- **Mobile:** bottom sheet for quick switch (reachable by thumb, drag handle, close on Escape or scrim tap, focus trapped); full-screen sheet for the picker. **Desktop:** the same list as a segmented control or dropdown at the top of the left column.

### 4.5 Reader

Server component, per request (nonce CSP, ADR 0007). Lora body at 62ch, verse numbers as superscripts, headings in tokens, light and dark. 44px minimum targets, 8px gaps. Title `John 3 (BSB)`. A short credit line under the text: BSB or WEB credit, or the ESV notice (the footer carries the full ESV notice).

### 4.6 Navigation data (no scripture text)

A static table `bible-books.ts`: 66 books with display name, slug, testament and chapter count. Previous and next chapter come from it (Genesis 1 has no previous, Revelation 22 no next; the button is disabled). Verse counts per chapter come from the imported BSB and WEB data, and for the ESV from `passage_meta.chapter_end` once a chapter is fetched (a static fallback table from the KJV versification feeds the stepper before the first fetch).

### 4.7 Picker

- Mobile: one full-screen sheet (Radix Dialog), four steps as tabs: Bible, Book, Chapter, Verses. Done steps show a tick and can be tapped to go back. "Read" is always at the top right.
- Desktop: permanent left column.
- Verses use two numeric steppers, not free typing. Empty means the whole chapter.
- 44px minimum targets, focus trap, Escape closes, `aria-live` announces the new reference.

### 4.8 Previous and next

- Mobile bottom bar with two full-height buttons that are links to the neighbouring chapter URL (they work without JavaScript).
- Desktop: links under the text and the left and right arrow keys (not while an input has focus).
- Swipe is optional polish: ignore horizontal swipes starting within 24px of the screen edge (iOS back gesture) and while text is being selected.

---

## 5. Step-by-step plan

One branch and PR per step, tests first (red, green, refactor), as in [PLAN.md](PLAN.md). Branch names of 36 characters or fewer. Tick a box when done and verified. Steps B0 to B6 and B8 to B9 need no ESV key; B7 does.

### B0 Decisions

- [x] Bibles: BSB first, WEB second, ESV third (2026-11-07)
- [x] ESV only through the API, called from the Next.js server; no footnotes or cross-references in the first release
- [ ] Re-read berean.bible/terms.htm and the eBible WEB details page; confirm the notice wording; record the date here
- [ ] Add the `BIBLE_ENABLED` feature flag (off by default)
- [ ] Write ADR 0009 "Bible reader: public-domain texts in the repo, ESV from the API" (sources, ESV limits, no donations)

### B1 Book data

- [ ] Test: 66 books, correct chapter counts (Genesis 50, Psalms 150, Revelation 22; single-chapter books Obadiah, Philemon, 2 John, 3 John, Jude)
- [ ] Add `bible-books.ts` (name, slug, testament, chapters)
- [ ] Helpers with tests: `findBook(slug)`, `neighbours(book, chapter)` (Gen 1 no previous, Rev 22 no next, crosses books), `parseVerseRange("16-18")` (rejects 0, reversed, beyond the chapter, more than one chapter)

### B2 Import BSB and WEB (spike, then build)

- [ ] Spike: download both USFM zips, parse John, report markup and numbering differences in this file; choose the WEB edition
- [ ] Test the parser on small USFM samples (paragraphs, poetry, headings, footnote markers removed, verse numbers, ranges like `\v 3-4`)
- [ ] Add `pnpm build:bible` writing `content/bibles/<version>/<book>/<chapter>.json`
- [ ] Test on the output: all 66 books, 1,189 chapters, no empty verse, verse numbers ascending, BSB John 3:16 and WEB John 3:16 match the source text exactly
- [ ] Commit the generated files; check repository size and function bundle size (`outputFileTracingIncludes`)
- [ ] Add `bible-versions.ts` (registry with notice text and `enabled` flags: BSB and WEB on, ESV off)

### B3 Source interface and local source

- [ ] Test: `getPassage` returns the right verses for a chapter and for a range; a range outside the chapter is rejected; unknown version or book gives not found
- [ ] Add `BibleSource` and `LocalSource` (server-only, reads the JSON)
- [ ] Missing verse in another version falls back to the whole chapter (test)

### B4 Reader page

- [ ] E2E (all projects): `/bible/bsb/john/3` shows "John 3", verse 16, the BSB credit and the footer notice; axe has no serious or critical issues
- [ ] E2E: `?v=16-18` shows only those verses with the range in the heading and a "Show full chapter" link
- [ ] E2E: bad input (`/bible/bsb/nobook/1`, `john/99`, `?v=20-10`, `/bible/esv/john/3` while disabled) gives 404 or a clear message, never a crash
- [ ] E2E: CSP holds (no inline style, no console violations)
- [ ] Build `app/bible/[version]/[book]/[chapter]/page.tsx` with `generateMetadata` (title "John 3 (BSB)", canonical URL); `/bible` redirects to `/bible/bsb/john/1`
- [ ] Typography per 4.5; screenshot at 375px first, then wider; light and dark

### B5 Pickers (version, book, chapter, verses)

- [ ] Unit tests: steps and their order; picking a version keeps the passage; picking a book resets the chapter; chapter grid has the right count; steppers stay in range; the disabled ESV card cannot be chosen; "Read" navigates to the right URL
- [ ] Build the version picker (radio cards, step 1) and the quick-switch sheet from the header chip
- [ ] Build the book, chapter and verse steps (mobile sheet, desktop column)
- [ ] E2E on iPhone SE, iPhone 13, Pixel 7: open, choose WEB, John, chapter 3, verses 16 to 18, read; targets at least 44px; focus trap and Escape work; switching version keeps the passage
- [ ] Remember the last version in `localStorage` (page works without it)
- [ ] Add "Bible" to `NAV_LINKS` after "Devotionals" (shared by the desktop header and the mobile menu, see mockup 8) and the footer; mark it `aria-current="page"` on `/bible/...` (with a non-colour cue); update the nav tests
- [ ] E2E: the header does not wrap at 1024px and 1100px with six links, the theme toggle and the CTA; if it does, shorten "What we believe" or move Bible beside the CTA

### B6 Previous and next

- [ ] Unit tests for neighbour links (Malachi 4 to Matthew 1; disabled ends)
- [ ] Mobile bottom bar, desktop links under the text
- [ ] E2E: on a phone, tapping "John 4 →" opens John 4; on Genesis 1 the previous button is disabled
- [ ] Arrow keys on desktop (E2E), ignored while typing in an input
- [ ] Optional swipe (4.8), only if it tests cleanly on iOS Safari and Android Chrome

### B7 ESV source (blocked until Crossway approves the application)

- [ ] Crossway approves the API application and issues the key
- [ ] Re-read https://api.esv.org/ terms; note the date; check any conditions in the approval email
- [ ] Add `ESV_API_KEY` as a Sensitive Vercel variable (Production and Preview), to the local `.env` and to `.env.example`; require it in `src/lib/env.ts` only when the ESV is enabled
- [ ] Test with a fake server (never call the real API in tests): sends `Authorization: Token ...`, builds the query, maps the response
- [ ] `EsvSource` with `import "server-only"`, `cache: "no-store"`, 5 second timeout; refuses any request over one chapter (R2)
- [ ] Test the key never appears in logs or errors
- [ ] Sanitiser and HTML-to-`Passage` conversion with tests: strips `script`, event attributes, `style`, unknown tags and links not to esv.org; keeps headings, verse numbers, poetry and the "(ESV)" mark; words unchanged (R6)
- [ ] In-memory LRU: never over 400 verses, evicts oldest, expires after 1 hour (test)
- [ ] Budget counters (60 per minute, 1,000 per hour, 5,000 per day) with a fake Redis; at 80% only cached passages; fallback when over budget or on any non-200 or timeout, never a thrown error (tests)
- [ ] Vercel Firewall rate-limit rule on `/bible/esv/*` (Hendrik applies it; add the steps to the runbook)
- [ ] Footer notice and esv.org link visible on ESV pages; the "(ESV)" label present
- [ ] Switch `enabled: true` for the ESV in the registry; E2E for an ESV chapter and the fallback

### B8 Compliance gate (before it goes public)

- [ ] Test: every ESV page contains "(ESV)", the esv.org link and the full notice
- [ ] Test: no page can request more than one chapter; Psalm 119 renders in full in all three versions
- [ ] Test: no ESV text on disk or in a data store (open 20 ESV chapters, search the repo, `.next/cache` and the database for a verse)
- [ ] Test: the bundle and page source do not contain `ESV_API_KEY` or its value
- [ ] Test: no `Cache-Control: public` on ESV pages
- [ ] Manual: confirm still no donations, ads or sponsorship anywhere on the site; read the ESV terms again
- [ ] `pnpm check:placeholders` and `check:devotionals` still pass

### B9 Docs and launch

- [ ] Update PLAN.md (new step), CLAUDE.md (§4 layout, §9 scripture copyright, decisions) and README
- [ ] Update `docs/privacy.md` (the ESV API receives the passage requested, no visitor data) and `docs/threat-model.md` (new outbound call, key handling, HTML sanitiser)
- [ ] Mobile screenshots at 375px in the PR; Lighthouse mobile budgets still met (JS under 100 KB on the landing page; the reader is a server component with only the pickers as client JS)
- [ ] Launch BSB and WEB first (`BIBLE_ENABLED` on in Production); turn the ESV on when B7 is done; watch the daily ESV query count for a week

### Later (not in the first release)

- [ ] Verse tap-to-select and a "Share this verse" link (reuses `verse-share.tsx`; share the URL plus the reference, never a long quote)
- [ ] Word search: local index for BSB and WEB; `search/` for the ESV
- [ ] Audio via the ESV `audio/` endpoint: ask Crossway first
- [ ] Parallel view (two versions side by side): check the ESV limits with Crossway first
- [ ] Other public-domain versions (KJV, ASV, Darby) through the same importer
- [ ] Offline reading or a native app: the ESV part needs a Crossway license (R12); BSB and WEB do not

---

## 6. Compliance quick check (for every PR that touches the reader)

1. ESV: does any page show more than one chapter or 500 verses? It must not.
2. ESV: is any ESV text stored beyond the 400-verse memory cache? It must not be.
3. ESV: "(ESV)" in every quotation, and the esv.org link plus the full notice on the page?
4. Is the text of every version unaltered (only whole verses, ellipsis for omissions)?
5. Is the ESV key server-only?
6. Is there anything paid, donated or advertised on the site?
7. Is there a download or bulk copy feature? There must not be.
8. Is any modified text still called "Berean" or "World English Bible"? It must not be.

---

## 7. Decisions and open items

Decided (2026-11-07): file name `bible_feature.md`; BSB first, WEB second, ESV third; the ESV call runs in the Next.js server; no footnotes or cross-references in the first release; buttons first, swipe as optional polish; a version picker is required.

Open (defaults apply unless you say otherwise):
1. WEB edition: default the 66-book "Update" edition with US spelling (LORD for God's name). Say if you prefer the "Classic" (Yahweh) or the British edition.
2. Parallel view: not in the first release.
3. Whether to ask Crossway directly (licensing@crossway.org) about showing the ESV beside other versions. Not needed to proceed, but it would remove the one grey area (how the 500-verse and 25% limits count on a multi-version page).
