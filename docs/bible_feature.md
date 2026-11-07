# Bible feature (read the Bible on the site)

Plan for a simple in-site Bible reader: pick a Bible version, a book, a chapter and optionally verses; previous and next chapter buttons on mobile; a version picker.

Bibles, in the order we build them:

1. **BSB** (Berean Standard Bible): first and default. Public domain, stored on our side.
2. **WEB** (World English Bible): second. Public domain, stored on our side.
3. **ESV**: third, from the ESV API (Crossway) under its free terms. Waits for Crossway's approval of our API application (applied 2026-11-07).

BSB and WEB do not depend on the ESV approval, so the reader ships first with those two. The ESV appears in the version picker as "Coming soon" until its key is live.

Mockups: [design/bible_mockups.html](design/bible_mockups.html) (mobile light and dark, version picker, quick switch, open mobile menu, and the picker options: three for desktop and three for phones; the chosen ones, desktop option A and phone option M1, are built). Mockups 4, 5 and 7 are the earlier picker designs and are superseded. Open it in a browser.

Sources read 2026-11-07: api.esv.org (terms and docs), crossway.org/permissions, berean.bible (downloads, licensing, terms), ebible.org/web and its details page, github.com/seven1m/open-bibles. Terms can change: re-read the relevant terms before building each source and before launch.

The site stays free ([site-is-free decision in CLAUDE.md](../CLAUDE.md)).

---

## 1. What we are building

| Need | Answer |
|---|---|
| Choose a Bible | Version picker: BSB, WEB, ESV (coming soon). Step 1 of the picker, plus a one-tap version chip in the reader header that opens a quick-switch sheet |
| Choose book, chapter, verses | Picker steps 2 to 4. Verses are optional (empty = whole chapter) |
| Mobile | Previous and next chapter buttons at the bottom, in thumb reach, naming the target ("← John 2", "John 4 →"). Optional swipe |
| Desktop (from 1024px) | A passage button above the text opens a three-column picker (books, chapters, verses) with a version control at the top; click a verse, then a second for a range; left and right arrow keys change chapter |
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
| Edition | BSB, "Current, updated to 3rd Printing" | The 66-book "Update" edition (US spelling, LORD for God's name), file `engwebp_usfm.zip`; decided in the B2 spike |

Plan:
- A build script `pnpm build:bible` parses USFM and writes one JSON file per chapter in a small structure of our own: `{ version, book, chapter, sections: [{ heading?, paragraphs: [{ poetry?: bool, verses: [{ n, text }] }] }] }`. Output goes to `apps/web/content/bibles/<version>/<book>/<chapter>.json`, committed to the repo (public domain, so committing is fine; the 500-verse storage cap applies only to the ESV).
- The script is a repeatable, tested step. We never edit the words by hand.
- A spike first (step B2): download both zips, parse one book, check headings, paragraph and poetry markup, footnote markers, and numbering differences between the two (Psalm titles, verse splits). Record findings in this file.
- Read at request time on the server with `node:fs`, no database needed. Files are traced into the Vercel function via `outputFileTracingIncludes`. Measured size: about 8.0 MB (BSB) and 7.2 MB (WEB) of JSON, 3.4 MB compressed in git; a chapter file is at most 44 KB (Psalm 119), and the reader reads one chapter at a time.
- Verse numbering: store the version's own numbering. The book data table (4.6) holds the ESV or KJV-style counts for the picker; per-version counts are read from the imported data, so each version's steppers are exact.

#### Regenerating the data

The generated files are committed, so the app needs no download at build time. To rebuild them (for example after a new BSB printing):

```
mkdir -p /tmp/bsb /tmp/web && cd /tmp
curl -sSL -o bsb.zip https://bereanbible.com/bsb_usfm.zip && unzip -q -o bsb.zip -d bsb
curl -sSL -o web.zip https://eBible.org/Scriptures/engwebp_usfm.zip && unzip -q -o web.zip -d web
cd apps/web
pnpm build:bible bsb /tmp/bsb/bsb_usfm      # the BSB files are in a bsb_usfm folder inside the zip
pnpm build:bible web /tmp/web
pnpm exec vitest run tests/unit/bible-data.test.ts
```

The script finds all 66 books before it reads any, checks each against the book table (chapter count, verses present, verse numbers increasing) and replaces the version's folder. It also writes `counts.json` (the last verse of every chapter, for the pickers). Running it twice on the same input gives byte-identical files. Treat the downloaded files as untrusted data: unzip them in their own folder and never run anything from inside them.

### 3a. Spike findings (2026-11-07)

Files downloaded to a scratch folder (not the repo) and analysed with a throwaway script.

**Edition chosen:** WEB Update, 66 books, US spelling, God's name as "LORD": `https://eBible.org/Scriptures/engwebp_usfm.zip` (the "Classic" zip uses "Yahweh" and adds the Deuterocanon). BSB: `https://bereanbible.com/bsb_usfm.zip`. The WEB zip is about 21 MB unzipped because every word carries a Strong's number; our JSON drops those.

**Structure matches our book table.** Both versions have exactly 1,189 chapters and the same chapter count in every one of the 66 books.

**Markup to handle.**

| | BSB | WEB |
|---|---|---|
| Section headings | `\s1`, `\s2`, `\ms` (about 3,000) | None. WEB pages have no section headings |
| Cross-reference line under a heading | `\r` (1,325): skip | none |
| Paragraphs | `\p`, `\pmo`, `\pc`, `\b` (blank line) | `\p`, `\m`, `\mi`, `\pi1`, `\nb`, `\b` |
| Poetry | `\q1`, `\q2`, `\qr` (right-aligned), `\qa` (Psalm 119 acrostic letters as a heading) | `\q1`, `\q2`, `\qs` Selah |
| Lists | `\li1`, `\li2` | `\li1` |
| Psalm titles | `\d` | `\d` |
| Speaker labels | none | `\sp` (Song of Solomon) |
| Footnotes | `\f + ... \f*` | same, with nested `\+wh ... \+wh*` |
| Words | plain | `\w word|strong="G1234"\w*`: keep the word, drop the number |

Footnotes, cross-references and Strong's numbers are removed in the first release (the spec already leaves footnotes off). The words are never changed.

**Numbering differences between BSB and WEB.**
- Psalm titles are unnumbered in both versions, so psalm verse numbers agree. The BSB file puts a `\v 1` marker inside the `\d` title line, so the importer treats `\d` as a title block and starts verse 1 after it (tested on Psalms 3 and 51).
- Verses present in the WEB and missing in the BSB (the BSB leaves them to footnotes): Matthew 17:21, 18:11, 23:14; Mark 7:16, 9:44, 9:46, 11:26, 15:28; Luke 17:36, 23:17; Acts 8:37, 15:34, 24:7, 28:29; John 5:4. So verse numbers are not always contiguous: the importer must not assume they are, and the picker's last verse comes from the data, not from counting.
- Romans: the WEB places the closing doxology at 14:24-26 (BSB 16:25-27). Romans 14 has 26 verses in the WEB and 23 in the BSB; Romans 16 has 25 in the WEB and 27 in the BSB. When switching version on these chapters, a range that does not exist in the other version falls back to the whole chapter, as already planned.
- No other chapter differs in its last verse.
- Five WEB verse numbers hold only a footnote and no verse text (Luke 17:36, Acts 8:37, 15:34, 24:7, Romans 16:25). The importer leaves them out, so the WEB data has 31,098 verses against 31,103 verse markers in the files. This was found by comparing the markers with the parsed verses, and it is the expected result.
- Parsed against the real files: BSB 1,189 chapters and 31,086 verses, WEB 1,189 chapters and 31,098 verses, no leftover markup, no repeated or descending verse numbers in either.
- Words of Jesus (`\\wj`) are kept as plain text for now; red-letter styling could come later from the same markers.

**Rules that follow for the importer and the reader.**
- Verse numbers ascend within a chapter but may skip; a verse range shows only the verses that exist; if none of the requested verses exist, show the whole chapter with a short note.
- Verse ranges in the source (`\v 3-4`) are kept as a combined verse labelled "3-4".
- `\qa` lines (Hebrew letters in Psalm 119) are kept as small headings, because they are part of the printed text.
- The front matter (`00-FRT...`) and non-canonical books in the zip are ignored; only the 66 books are read.

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

As built in B3, a source returns one whole chapter (`getChapter(version, book, chapter)`), and a shared function, `selectVerses`, picks the verses. The ESV source (B7) will therefore convert the API's HTML into the same chapter shape and reuse the same picker.

Verse rules (`selectVerses`):
- Malformed input (`0`, `5-3`, `1,3`, words, blanks, spaces, more than three digits) is `invalid-range` (the page shows a clear message or 404).
- A well-formed range that runs past the end is clamped to the last verse (`5-40` in a 6-verse chapter shows 5 to 6).
- A well-formed range with none of its verses in this version (the chapter is shorter, or the verse is skipped, like Matthew 17:21 in the BSB) shows the whole chapter and reports the request in `fallback`, so the page can say "Verses 24-26 are not in this Bible".
- If only some verses in the range exist (Matthew 17:20-22 in the BSB) the ones that exist are shown.
- A heading, Psalm title or label is kept when the block it introduces starts inside the range; a blank-line break is kept only between two kept blocks.

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
- **Remembered.** The last Bible you read is kept in a first-party preference cookie (`bible-version`), so `/bible` opens in it. The URL still decides what renders; the cookie only chooses where `/bible` goes. It is a functional preference like the theme cookie, not tracking.
- **Modal dialogs and the CSP:** a modal Radix dialog locks page scrolling by injecting a `<style>` element, which the nonce-based CSP blocks unless it carries the nonce. `CspNonce` (in the root layout) hands the page's script nonce to the library (`get-nonce`), and an e2e test opens the sheet and fails on any CSP violation. Use modal dialogs freely after this; keep the mobile menu non-modal as it is.
- **Mobile:** bottom sheet for quick switch (reachable by thumb, drag handle, close on Escape or scrim tap, focus trapped); full-screen sheet for the picker. **Desktop:** the same segmented control at the top of the columns popover.

### 4.5 Reader

Server component, per request (nonce CSP, ADR 0007). Lora body at 62ch, verse numbers as superscripts, headings in tokens, light and dark. 44px minimum targets, 8px gaps. Title `John 3 (BSB)`. A short credit line under the text: BSB or WEB credit, or the ESV notice (the footer carries the full ESV notice).

### 4.6 Navigation data (no scripture text)

A static table `bible-books.ts`: 66 books with display name, slug, testament and chapter count. Previous and next chapter come from it (Genesis 1 has no previous, Revelation 22 no next; the button is disabled). Verse counts per chapter come from the imported BSB and WEB data, and for the ESV from `passage_meta.chapter_end` once a chapter is fetched (a static fallback table from the KJV versification feeds the stepper before the first fetch).

### 4.7 Picker

- Phone (below 1024px): a bottom sheet (Radix Dialog) with Book, Chapter and Verses tabs that show the current choice (John, 3, 16–18). Choosing a book or chapter moves to the next tab; any tab can be tapped. The Bible is a segmented control in the header. Whole chapter and Read sit in a footer in thumb reach.
- Desktop (from 1024px): a passage button above the text opens a three-column popover: books (with a filter, no counts), chapters, verses.
- Chapters come in pages of 25 for long books (Psalms has six). Verses are a grid: one click chooses a verse, a second click makes a range, the same verse twice keeps just that verse, and the chosen verses join into one band. Nothing chosen means the whole chapter (the Whole chapter button is marked while it applies).
- Nothing applies until Read, and unfinished choices are dropped when the picker closes.
- 44px minimum targets, focus trap, Escape closes, `aria-live` announces the next action. Every mounted picker needs its own radio group name.

### 4.8 Previous and next

- Mobile bottom bar with two full-height buttons that are links to the neighbouring chapter URL (they work without JavaScript).
- Desktop: links under the text and the left and right arrow keys (not while an input has focus).
- Swipe is optional polish and is not built (see B6): ignore horizontal swipes starting within 24px of the screen edge (iOS back gesture) and while text is being selected.

---

## 5. Step-by-step plan

One branch and PR per step, tests first (red, green, refactor), as in [PLAN.md](PLAN.md). Branch names of 36 characters or fewer. Tick a box when done and verified. Steps B0 to B6 and B8 to B9 need no ESV key; B7 does.

### B0 Decisions

- [x] Bibles: BSB first, WEB second, ESV third (2026-11-07)
- [x] ESV only through the API, called from the Next.js server; no footnotes or cross-references in the first release
- [ ] Re-read berean.bible/terms.htm and the eBible WEB details page; confirm the notice wording; record the date here
- [x] Add the `BIBLE_ENABLED` feature flag (off by default; `BIBLE_ENABLED=1` shows the pages; set for the e2e server in `playwright.config.ts`, documented in `.env.example` and the README)
- [ ] Write ADR 0009 "Bible reader: public-domain texts in the repo, ESV from the API" (sources, ESV limits, no donations)

### B1 Book data

- [x] Test: 66 books, correct chapter counts (Genesis 50, Psalms 150, Revelation 22; single-chapter books Obadiah, Philemon, 2 John, 3 John, Jude)
- [x] Add `src/lib/bible/books.ts` (name, slug, testament, chapters)
- [x] Helpers with tests: `findBook(slug)`, `hasChapter`, `neighbours(book, chapter)` (Gen 1 no previous, Rev 22 no next, crosses books) in `books.ts`, and `parseVerseRange("16-18", lastVerse)` in `range.ts` (rejects 0, reversed, beyond the chapter, lists, whitespace; one chapter only by construction)

### B2 Import BSB and WEB (spike, then build)

- [x] Spike: download both USFM zips, parse John, report markup and numbering differences in this file; choose the WEB edition (findings in section 3a)
- [x] Test the parser on small USFM samples (paragraphs, poetry, headings, footnote markers removed, verse numbers, ranges like `\v 3-4`): `src/lib/bible/usfm.ts` and `types.ts`, 23 tests; also run against the real files (see 3a)
- [x] Add `pnpm build:bible` writing `content/bibles/<version>/<book>/<chapter>.json` (`scripts/build-bible.mts`, with `src/lib/bible/import.ts` and `usfm-codes.ts`; see "Regenerating the data" in section 3)
- [x] Test on the output (`tests/unit/bible-data.test.ts`): all 66 books, 1,189 chapters, no empty verse, verse numbers ascending, BSB John 3:16 and WEB John 3:16 match the source text exactly
- [x] Commit the generated files and check the repository size (about 15 MB of JSON, 3.4 MB compressed; largest chapter file 44 KB)
- [x] Trace `content/bibles` into the reader's route with `outputFileTracingIncludes` and check the function bundle size. Found and fixed on the way: the devotional loader's `process.cwd()/content` path made every route that reads devotionals ship the whole `content/` folder, so the landing page would have shipped 15 MB of Bible text. Now only `/bible/**` ships `content/bibles` (2,378 files); `/`, `/devotionals/*` and `/content/**` ship none (checked in the build's `.nft.json` files)
- [x] Add `src/lib/bible/versions.ts` (registry with credit text, source and `enabled` flags: BSB and WEB on, ESV off) with tests

### B3 Source interface and local source

- [x] Test: `getPassage` returns the right verses for a chapter and for a range; malformed verses are rejected (`invalid-range`); unknown or disabled versions, unknown books and chapters out of range give `not-found`; no path can be steered outside the data folder (`tests/unit/bible-source.test.ts`, `bible-passage.test.ts`)
- [x] Add `BibleSource` (in `types.ts`), `localSource()` (`local-source.ts`, server-only, reads the JSON) and `getPassage()` (`get-passage.ts`); the pure verse picker is `selectVerses()` in `passage.ts`
- [x] Missing verse in another version falls back to the whole chapter (test: Romans 14:24-26 in the BSB, Matthew 17:21 in the BSB)

### B4 Reader page

- [x] E2E (all projects): `/bible/bsb/john/3` shows "John 3", verse 16, the BSB credit and the footer notice; axe has no serious or critical issues in light and dark (`tests/e2e/bible.spec.ts`, which also proves the axe helper catches a real violation)
- [x] E2E: `?v=16-18` shows only those verses with the range in the heading and a "Show full chapter" link (44px tall)
- [x] E2E: bad input gives 404 or a clear message, never a crash. Unknown book, chapter out of range, `03`, `1.5`, `abc`, the disabled ESV and unknown versions return 404; a verse range that cannot be read (`20-10`, `abc`, `0`, `1,2`, a repeated `?v=`) shows the whole chapter with a note instead
- [x] E2E: CSP holds (no inline style, no console violations, every inline script has the nonce), and the longest chapter (Psalm 119) does not scroll sideways
- [x] Build `app/bible/[version]/[book]/[chapter]/page.tsx` with `generateMetadata` (title "John 3 (BSB)", canonical URL; a verse range points at its chapter); `/bible` redirects to `/bible/bsb/john/1`; pages return 404 unless `BIBLE_ENABLED=1`
- [x] Typography per 4.5; checked at 375px, 768px and 1280px, light and dark. Poetry and list lines hang (a wrapped line sits further in than a new line) so they cannot be confused

### B5 Pickers (version, book, chapter, verses)

- [x] Unit tests for the pure picker logic (`src/lib/bible/picker.ts`, `tests/unit/bible-picker.test.ts`): steps and their order; picking a version keeps the passage; picking a book resets the chapter; chapter grid has the right count; steppers stay in range (using each version's own last verse); the disabled ESV cannot be chosen; "Read" gives the right address. The pickers read last verses from `content/bibles/<version>/counts.json` (3.6 KB, no text, written by `pnpm build:bible`), so the browser never loads chapter text
- [x] Build the version picker (radio cards, step 1 of the sheet) and the quick-switch sheet from the chip beside the passage button (`version-list.tsx`, `version-switcher.tsx`); on desktop a segmented control at the top of the column
- [x] Build the book, chapter and verse steps: a full-screen sheet below 1024px (`passage-sheet.tsx` with `pick-book`, `pick-chapter`, `pick-verses`; opens on Book with the current book centred) and a permanent column from 1024px (replaced by the columns popover, `passage-popover.tsx`, see the next item)
- [x] Replace the desktop left column with the columns popover (option A in `docs/design/bible_mockups.html`): one passage button opens books (with a filter), chapters (pages of 25 for long books) and a verse grid side by side; one click is one verse, a second click a range, Whole chapter clears; nothing applies until Read; each verse picker has its own radio group name (two mounted pickers shared one and unchecked each other)
- [x] Replace the four-step phone sheet with the tabbed sheet (option M1 in `docs/design/bible_mockups.html`): a bottom sheet with Book, Chapter and Verses tabs that show the current choice (John, 3, 16–18), the same book filter, chapter pages of 25 and verse band as the desktop popover, the Bible as a segmented control in the header, and Whole chapter and Read in a footer in thumb reach (`passage-sheet.tsx`; shared parts in `picker-parts.tsx` and `use-passage-picker.ts`)
- [x] E2E on iPhone SE, iPhone 13, Pixel 7 (and desktop browsers at 800px and 1280px): open, choose WEB, John, chapter 3, verses 16 to 18, read; every control at least 44px in every step; focus trap and Escape work; switching version keeps the passage; no CSP violation and no serious axe problem on any step in light and dark (`bible-picker.spec.ts`, `bible-version.spec.ts`, `bible-popover.spec.ts`)
- [x] Remember the last version (page works without it). Done with a first-party preference cookie (`bible-version`, Lax, one year, Secure over https, like the theme cookie) instead of `localStorage`, so `/bible` opens in your last Bible on the server with no flash and no JavaScript. The reader writes it from the browser (no request); only an enabled version is ever accepted, so a forged value opens the BSB
- [x] Add "Bible" after "Devotionals" in the desktop header, the mobile menu (mockup 8) and the footer's Read group, shown only while `BIBLE_ENABLED=1` (`navLinks()`, `NavLink`); `aria-current="page"` on `/bible/...` with an underline and heavier weight (and a bar and tint in the mobile menu), not colour alone; nav tests updated
- [x] E2E: the header does not wrap at 1024px, 1100px and 1280px with six links, the theme toggle and the CTA (no change to the header needed); the menu entry and footer link work on phones (`tests/e2e/bible-nav.spec.ts`)

### B6 Previous and next

- [x] Unit tests for the neighbour links (`chapter-nav.tsx`, `tests/unit/bible-chapter-nav.test.tsx`): Malachi 4 to Matthew 1 and back, the Testament boundary, Genesis 50 to Exodus 1, "2 John 1", disabled ends at Genesis 1 and Revelation 22, the chosen Bible kept and a verse range dropped, explicit "Previous chapter: John 2" names, tall targets. The pure neighbour logic was tested in B1
- [x] Mobile bottom bar (sticky to the bottom of the screen, two full-height buttons, Next filled as in the mockup, rests above the footer so it never covers it), desktop links under the text (`lg:static`). Plain links, so they work without JavaScript. `rel="prev"` and `rel="next"` are in the page head
- [x] E2E (`tests/e2e/bible-chapters.spec.ts`): on phones the bar is pinned with two buttons of at least 44px, tapping "John 4" opens John 4 (from a verse range too: the whole chapter), the bar rests above the footer and hides no text, on Genesis 1 the previous button is disabled and on Revelation 22 the next one, Malachi 4 and Matthew 1 connect, and the buttons work with JavaScript off
- [x] Arrow keys (`arrow-keys.tsx`, unit and E2E): left and right open the previous and next chapter. They are ignored with Alt, Ctrl, Cmd or Shift (Alt+Left is the browser's Back), when another handler already used the key, in text fields, selects, radios, sliders, menus and open dialogs, so a focused radio in the Bible switch keeps its arrow key (tested) and the passage sheet is left alone (tested)
- [ ] Optional swipe (4.8): not built. The spec allows it only if it tests cleanly on iOS Safari and Android Chrome, and it cannot be verified on real devices here. The bottom buttons already put both directions in thumb reach, and a horizontal swipe risks clashing with the iOS back gesture and text selection. Revisit with real-device testing if readers ask for it

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
1. WEB edition: decided in the B2 spike: the 66-book "Update" edition (US spelling, LORD). Say if you prefer the "Classic" (Yahweh) or the British edition.
2. Parallel view: not in the first release.
3. Whether to ask Crossway directly (licensing@crossway.org) about showing the ESV beside other versions. Not needed to proceed, but it would remove the one grey area (how the 500-verse and 25% limits count on a multi-version page).
