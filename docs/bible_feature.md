# Bible feature (read the Bible on the site)

Plan for a simple in-site Bible reader: pick a Bible, a book, a chapter and optionally verses; previous and next chapter buttons on mobile. Text comes from the ESV API (Crossway) under its free terms.

Mockups: [design/bible_mockups.html](design/bible_mockups.html) (mobile light and dark, picker steps, desktop). Open it in a browser.

Sources: https://api.esv.org/ (terms), `/docs/`, `/docs/passage-text/`, `/docs/passage-html/`, `/docs/passage-search/`, `/docs/passage-audio/`. Read 2026-11-07. Crossway can change its terms: re-read the terms page before building and before launch.

Status: blocked until Crossway approves the API application (applied 2026-11-07, approval pending). Do not start B1 or later until the key is issued. The mockups and this plan can still be reviewed. Fits Phase 1 after 1.3 (email sign-up) or as its own step; the site stays free ([site-is-free decision in CLAUDE.md](../CLAUDE.md)).

---

## 1. What we are building

| Need | Answer |
|---|---|
| Choose a Bible | Picker step 1. Only the ESV today (the only one we hold terms for). The step exists so other Bibles can be added later without a redesign |
| Choose book, chapter, verses | Picker steps 2 to 4. Verses are optional (empty = whole chapter) |
| Mobile | Previous and next chapter buttons at the bottom, in thumb reach, naming the target ("← John 2", "John 4 →"). Optional swipe |
| Desktop | Permanent left column picker; left and right arrow keys change chapter |
| Simple | One page, one URL per passage, no accounts, no search in the first release |

URLs (shareable, no JavaScript needed to read):

```
/bible                      -> redirects to /bible/esv/john/1
/bible/esv/john/3           whole chapter
/bible/esv/john/3?v=16-18   verse range (one chapter only)
```

---

## 2. What the ESV API gives us

Base: `https://api.esv.org/v3/passage/`. Auth on every request: header `Authorization: Token <API_KEY>`. All endpoints take `q` (the passage).

| Endpoint | Use | Notes |
|---|---|---|
| `text/` | Plain text | JSON; verse numbers in square brackets |
| `html/` | HTML | JSON; we use this one (see 4.2) |
| `search/` | Word search | `q`, `page-size` (default 20, max 100), `page`. Returns `reference` and `content` per hit. Later |
| `audio/` | MP3 | Redirects to an MP3 (follow redirects). Only `q`. Later; terms for audio are not stated, ask Crossway first |

Passage query forms: `John 3`, `John 3:16-18`, `jn3.16`, `Genesis 1-3`, `43003016`, `01001001-01011032`, several with `;` or `,`.

Response (both text and html):

```
{ "query", "canonical", "parsed": [[43003016, 43003018]],
  "passage_meta": [{ "canonical", "chapter_start": [first, last verse id],
                     "chapter_end": [first, last verse id],
                     "prev_verse", "next_verse",
                     "prev_chapter": [first, last], "next_chapter": [first, last] }],
  "passages": ["..."] }
```

Verse ids are `BBCCCVVV` (book 43 = John, chapter 003, verse 016 is `43003016`). `prev_chapter` and `next_chapter` give the neighbouring chapter's first and last verse id, which is how the arrows can be checked against the API.

Useful options on `html/` (default in brackets): `include-passage-references` (true), `include-verse-numbers` (true), `include-first-verse-numbers` (true), `include-headings` (true), `include-subheadings` (true), `include-footnotes` (true), `include-footnote-body` (true), `include-crossrefs` (false), `include-audio-link` (true), `include-short-copyright` (true), `include-copyright` (false, exclusive with the short one), `include-chapter-numbers` (true), `include-book-titles` (false), `include-verse-anchors` (false), `wrapping-div` (false), `div-classes` ("passage"), `paragraph-tag` ("p"), `include-surrounding-chapters` (false), `include-css-link` and `inline-styles` (false).

HTML output (from the docs' example): `h2.extra_text` with the reference, `p` with `b.verse-num` (id like `v43011035-1`), poetry as indented lines, and a closing `(<a class="copyright" href="http://www.esv.org">ESV</a>)`.

Not documented anywhere I could read: error codes and bodies, response size cap. Treat any non-200 as "unavailable" (see step 4).

---

## 3. Rules we must follow (free terms)

The plan in section 5 turns each rule into a step and a test; section 6 is the per-PR check.

| # | Rule (from api.esv.org terms) | What it means here |
|---|---|---|
| R1 | Non-commercial only: no charge for any part of the site, and no donations, advertising or sponsorship | Already true. Do not add any of these near the reader. Any change needs a Crossway license first |
| R2 | At most 500 verses, or half a book (whichever is less), per query | We request one chapter at most. The longest chapter, Psalm 119, is 176 verses. Single and double-chapter books are exempt but we do not need that |
| R3 | At most 500 verses or half a book on any page | One chapter or range per page. No "read the whole book" page, no multi-chapter ranges |
| R4 | You may cache or store at most 500 verses locally; Crossway asks you to clear caches regularly | Cache only a small in-memory set (section 4.3). Never write ESV text to the database, the repo, a Next.js data cache on disk, Redis or a CDN |
| R5 | Rate limits: 5,000 queries per day, 1,000 per hour, 60 per minute; beyond that the app is throttled | Small cache, a global budget counter and a friendly fallback (steps 4.4 and 4.5) |
| R6 | Each quotation includes "ESV"; each page using the text links to www.esv.org; include the copyright notice sent with the text | Keep `include-short-copyright` on (adds "(ESV)"). The footer on every page carries the full notice and the esv.org link (already built) |
| R7 | Do not alter the text. Headings, footnotes, cross-references and verse numbers may be omitted. Omitted parts of verses are marked with an ellipsis | We never edit words. Verse ranges show whole verses only. Our tooling only wraps and removes markup |
| R8 | Never sell, share or publish the API key | Key only in a server-only module and a Sensitive Vercel variable. Never `NEXT_PUBLIC_`, never committed, never in a client bundle |
| R9 | Users may not copy or download more than 500 verses or half a book | No "download", "print book" or "copy chapter" feature. Do not add bulk export |
| R10 | The ESV text may not be quoted in a Creative Commons licensed publication and may not be translated | The repo has no license; do not add a CC license to pages that carry the ESV. No translation features |
| R11 | Use must be consistent with historic Christian doctrine and the statement of faith; no illegal or immoral content on the site | Met by our statement of faith. Keep the Bible pages free of unrelated content |
| R12 | Crossway may cancel access at any time; no uptime guarantee | The page degrades to a link to the passage on www.esv.org, never a blank page |
| R13 | Licenses go to organisations, not individuals. Needed for uses beyond these terms | If we want offline use, a native app with a full Bible, other limits, or monetisation, apply at https://crosswaygnp.formstack.com/forms/esv_digital_licensing_proposal first |

Also: the free terms cover personal, church and ministry use. Keep the footer notice exactly as in `apps/web/src/lib/scripture.ts`.

---

## 4. Design decisions

### 4.1 Where the code runs

Next.js server calls the ESV API directly from a server-only module (`apps/web/src/lib/esv/`). The browser never sees the key and the API has no personal data to protect, so FastAPI is not involved (the BFF rule in CLAUDE.md is about our own API; there is nothing to store). Recommended for simplicity. The alternative, routing through FastAPI to reuse its Redis rate limiter, is listed in the open questions.

### 4.2 HTML or text

Use `html/` and sanitise on the server. Reason: poetry, paragraphs, headings and verse ids come ready, so there is no custom parser for the text format. Request options: headings and verse numbers on; footnotes, cross-references and the audio link off (simple; omission is allowed by R7); short copyright on; `wrapping-div` on with class `passage`. Run the result through an allow-list sanitiser (tags `h2 h3 h4 p span b i sup br div a`, attributes `class id`, `href` only to `www.esv.org`), then render. Style with our own CSS using tokens (no `inline-styles`, because the CSP forbids inline styles).

Each verse needs a tap target of at least 44px for selecting a range (optional step 5): the server wraps each verse in a `span` with a `data-verse` attribute while it already has the HTML.

### 4.3 Caching (R4)

- In-memory LRU in the server module only. Cap: 400 verses in total (under the 500 limit), time to live 1 hour (so updates arrive), evicted by oldest use.
- `fetch(..., { cache: "no-store" })` so the Next.js Data Cache never writes ESV text to disk.
- No `Cache-Control: public` on pages that embed the text (pages are per request already, see ADR 0007).
- Static data that is not ESV text is fine to store: the list of 66 books, names, slugs, chapter counts, verse counts per chapter.

### 4.4 Rate limits (R5)

- Global counters (not text) per minute, hour and day, kept in Upstash Redis. At 80% of any limit, serve only cached passages; at 100% show the fallback.
- A Vercel Firewall rate-limit rule on `/bible/*` per IP so one visitor or bot cannot use the daily budget.
- On a non-200 from the ESV or a refused call, show the fallback (4.5).

### 4.5 Fallback (R12)

"The ESV text is not available right now. Read John 3 on esv.org" linking to `https://www.esv.org/John+3/`. Same page layout, no blank state.

### 4.6 Navigation data

A static table `bible-books.ts`: for each of the 66 books, the display name, URL slug, testament, chapter count, and verse count per chapter. The verse counts come from a public-domain source (for example the KJV versification), then a script spot-checks every chapter against `passage_meta.chapter_end` from the ESV and lists differences. Previous and next chapter come from this table (Genesis 1 has no previous, Revelation 22 has no next; the button is disabled). Never from scraping.

### 4.7 Picker (see mockups 2 and 3)

- Mobile: one full-screen sheet (Radix Dialog), four steps shown as tabs: Bible, Book, Chapter, Verses. Done steps show a tick and can be tapped to go back. "Read" is always at the top right.
- Desktop: permanent left column with the book list and chapter grid; verse from/to steppers above the text.
- Verses use two numeric steppers, not free typing. Empty means the whole chapter.
- 44px minimum targets, 8px gaps, labelled buttons, focus kept inside the sheet, closes on Escape, announces the new reference with `aria-live`.
- Last position remembered in `localStorage` as a convenience only (the page works without it).

### 4.8 Previous and next

- Bottom bar on mobile with two full-height buttons ("← John 2", "John 4 →"); they are links to the neighbouring chapter URL, so they work without JavaScript.
- Desktop: the same links under the text, plus the left and right arrow keys (not while an input has focus).
- Swipe left and right is optional polish: ignore horizontal swipes that start within 24px of the screen edge (iOS back gesture) and while text is being selected. The buttons stay either way.

---

## 5. Step-by-step plan

One branch and PR per step, tests first (red, green, refactor), as in [PLAN.md](PLAN.md). Branch names of 36 characters or fewer. Tick a box when done and verified.

### B0 Decisions and access

- [ ] Crossway approves the API application and issues the key (applied; waiting). Everything after B0 waits for this
- [ ] Re-read https://api.esv.org/ terms; note the date in this file
- [ ] Create the ESV account and an API application at api.esv.org (needs a sign-in; Hendrik does this)
- [ ] Decide the open questions in section 7
- [ ] Add `ESV_API_KEY` as a Sensitive variable in Vercel (web project, Production and Preview), and to the local `.env` (not committed); add the name to `.env.example`; extend `src/lib/env.ts` (Zod) to require it only when the Bible feature is on
- [ ] Write ADR 0009 "Bible text from the ESV API" (free terms, caching limit, no donations)
- [ ] Add `BIBLE_ENABLED` feature flag (off by default)

### B1 Book data (no ESV text)

- [ ] Test: 66 books, correct chapter counts (Genesis 50, Psalms 150, Revelation 22, single-chapter books Obadiah, Philemon, 2 John, 3 John, Jude)
- [ ] Add `bible-books.ts` (name, slug, testament, chapters, verses per chapter)
- [ ] Helpers with tests: `findBook(slug)`, `neighbours(book, chapter)` (Gen 1 has no previous, Rev 22 no next, crosses books), `parseVerseRange("16-18")` (rejects 0, reversed, beyond the chapter, more than one chapter)
- [ ] Script `pnpm check:bible-data` compares verse counts with the ESV `passage_meta` (run by hand, not in CI, so it costs no quota in CI); record any differences

### B2 ESV client (server-only)

- [ ] Test with a fake server (never call the real API in tests): sends `Authorization: Token ...`, builds the query, maps response fields
- [ ] Add `src/lib/esv/client.ts` with `import "server-only"`: `getPassage(book, chapter, verses?)` using `html/` and the options from 4.2, `cache: "no-store"`, timeout of 5 seconds
- [ ] Refuse any request over one chapter (R2, R3) with a test
- [ ] Test that the key never appears in logs or errors
- [ ] Sanitiser with tests: strips `script`, event attributes, `style`, unknown tags, links not to esv.org; keeps headings, verse numbers, poetry and the "(ESV)" mark; text content is byte-for-byte unchanged (R7)
- [ ] Wrap each verse in `span[data-verse]` (test with Psalm 23 and a poetry chapter)

### B3 Cache and limits

- [ ] Test the LRU: never holds more than 400 verses, evicts oldest, expires after 1 hour
- [ ] Add the in-memory cache (4.3)
- [ ] Test the budget counters (60 per minute, 1,000 per hour, 5,000 per day) with a fake Redis; at 80% only cached passages are served
- [ ] Add the counters (Upstash) and the fallback
- [ ] Test: non-200, timeout and over-budget all return the fallback state, never throw
- [ ] Vercel Firewall rate-limit rule on `/bible/*` (document the dashboard steps in the runbook; Hendrik applies it)

### B4 Reader page

- [ ] E2E (all projects): `/bible/esv/john/3` shows "John 3", verse 16, "(ESV)", and the footer notice and www.esv.org link; axe has no serious or critical issues
- [ ] E2E: `/bible/esv/john/3?v=16-18` shows only 16 to 18 with the range in the heading and a "Show full chapter" link
- [ ] E2E: bad input (`/bible/esv/nobook/1`, `john/99`, `?v=20-10`) gives 404 or a clear message, never a crash
- [ ] E2E: CSP holds (no inline style, no console violations)
- [ ] Build `app/bible/[translation]/[book]/[chapter]/page.tsx` (server component) with `generateMetadata` (title "John 3 (ESV)", canonical URL); `/bible` redirects to `/bible/esv/john/1`
- [ ] Reader typography: Lora body, 62ch measure, verse numbers as superscript, headings styled with tokens; light and dark checked at 375px first
- [ ] Fallback component (4.5)
- [ ] Footer notice visible on the page without scrolling past other content (the shared footer)

### B5 Picker

- [ ] Unit tests: steps and their order; picking a book resets the chapter; chapter grid has the right count; verse steppers stay in range; "Read" navigates to the right URL
- [ ] Build the picker (mobile sheet, desktop column) per 4.7
- [ ] E2E on iPhone SE, iPhone 13, Pixel 7: open, choose John, chapter 3, verses 16 to 18, read; targets at least 44px; focus trap and Escape work
- [ ] Add "Bible" to `NAV_LINKS` (header and mobile menu) and the footer; update the nav tests

### B6 Previous and next

- [ ] Unit tests for the neighbour links (including crossing from Malachi 4 to Matthew 1, and the disabled ends)
- [ ] Bottom bar buttons on mobile, links under the text on desktop
- [ ] E2E: on a phone viewport, tapping "John 4 →" opens John 4; on Genesis 1 the previous button is disabled
- [ ] Arrow keys on desktop (E2E), ignored while typing in an input
- [ ] Optional swipe (4.8), only if it tests cleanly on iOS Safari and Android Chrome

### B7 Compliance gate (before it goes public)

- [ ] Test: every Bible page contains "(ESV)", the esv.org link and the full notice
- [ ] Test: no page can request more than one chapter; Psalm 119 renders in full
- [ ] Test: nothing under `apps/web/content`, the database, `.next/cache` or any file contains ESV text produced by the feature (run the app, open 20 chapters, search the disk for a verse)
- [ ] Test: the bundle and page source do not contain `ESV_API_KEY` or its value
- [ ] Test: no `Cache-Control: public` on the Bible pages
- [ ] Manual: read the terms again; confirm still no donations, ads or sponsorship anywhere on the site
- [ ] `pnpm check:placeholders` and `check:devotionals` still pass
- [ ] Add the Bible pages to `sitemap` only if the metadata step (1.6) is done; otherwise skip

### B8 Docs and launch

- [ ] Update PLAN.md (new step), CLAUDE.md (§4 layout, §9 scripture copyright, decisions), README
- [ ] Update `docs/privacy.md` (the ESV API receives the passage requested but no visitor data: server-to-server, no IP forwarded) and `docs/threat-model.md` (new outbound call; key handling; HTML sanitiser)
- [ ] Mobile screenshots at 375px in the PR; Lighthouse mobile budgets still met (LCP under 2.0 s, JS under 100 KB on the landing page; the reader is a server component with only the picker as client JS)
- [ ] Turn `BIBLE_ENABLED` on in Production; watch the daily query count for a week

### Later (not in the first release)

- [ ] Verse tap-to-select and a "Share this verse" link (reuses `verse-share.tsx`; share the URL plus the reference, never a long quote)
- [ ] Word search with `search/` (page size 20, quotes for exact phrases); results show reference and snippet and link into the reader
- [ ] Audio via `audio/` or the HTML audio link: ask Crossway first, because the audio terms are not stated on the pages read
- [ ] More Bibles (public domain: BSB, WEB), each with its own notice, behind the same picker step 1
- [ ] Offline reading or a native app: needs a Crossway license (R13)

---

## 6. Compliance quick check (for every PR that touches the reader)

1. Does any page show more than one chapter or 500 verses? It must not.
2. Is ESV text stored anywhere beyond the 400-verse memory cache? It must not be.
3. Is "(ESV)" in every quotation, and the esv.org link plus the full notice on the page?
4. Is the text unaltered (only whole verses, ellipsis for omissions)?
5. Is the key server-only?
6. Is there anything paid, donated or advertised on the site?
7. Is there a download or bulk copy feature? There must not be.

---

## 7. Decisions (answered 2026-11-07)

1. **File name:** `docs/bible_feature.md`.
2. **Bibles:** ESV only. The picker keeps the Bible step so others can be added later.
3. **Where the call runs:** Next.js server directly, in an isolated `lib/esv/` module. It is a read-only third-party API with a server-held key and no visitor data, so an extra FastAPI hop adds a failure point and no security. If a native app is built (Phase 2 gate), move the client behind FastAPI then.
4. **Footnotes and cross-references:** off in the first release.
5. **Swipe:** buttons first, swipe only as optional polish.
6. **Gate:** nothing is built until the ESV API application is approved and the key is issued. B0 first item below.
