# Landing page: outstanding UI checklist

Status as of 2026-11-07. The Bible reader, its pickers and the PWA steps have their own lists: [bible_feature.md](bible_feature.md) and [PWA_checklist.md](PWA_checklist.md). Covers only what a visitor sees and uses. Backend, email and launch operations stay in [PLAN.md](PLAN.md); the step numbers below point there.

Legend: `[ ]` todo, `[x]` done. **(Hendrik)** needs content or a decision from the owner.

Work top to bottom. Build and screenshot at 375px before wider widths.

---

## A. Done (for reference)

- [x] Design system: Dawn patrol (light) and Night swell (dark), cookie-backed theme toggle (1.1)
- [x] UI primitives: button, input, textarea, checkbox, label, field error (1.1)
- [x] Sticky header with CTA, accessible mobile menu, skip link (1.1)
- [x] Inline SVG logo, safe-area insets, reduced motion, 44px touch targets (1.1)
- [x] Sections: hero, about, what's coming with sample surf report, start here, statement of faith, founder, footer with ESV notice (1.2)
- [x] Screenshot review at 375, 768 and 1280 against the mockup (1.2)
- [x] Theme toggle in the header: top right from `lg`, a Theme row in the mobile menu below `lg`
- [x] Writer section with Henno's story, church and a square surfing photo; statement of faith with four points
- [x] ESV notice per the Crossway API terms (usage-limit line, esv.org link, "(ESV)" on quotations)

---

## B. Real content to replace placeholders **(Hendrik)**

`pnpm check:placeholders` (in `apps/web`) currently reports 2 leftovers (the footer social handles). It must report none before launch (gate in 1.9). All text lives in `apps/web/src/content/landing.ts`.

- [x] About: two new paragraphs and the "paddle out with us" link to `#subscribe` (from `about.md`)
- [x] What's coming: the weekly card is labelled "Rolling in consistently" (the launch date was removed from the card)
- [x] What's coming: publish day set to Saturday
- [x] What's coming: first series sentence removed (decide later)
- [x] What's coming: audio format sentence removed (decide later)
- [x] Sample surf report replaced by the real first devotional, read from `content/devotionals` (see `docs/devotional_format.md`)
- [x] Statement of faith: four points, placeholder removed (optional later: add a point on the Holy Spirit or Jesus' return, or link a full statement)
- [x] Founder: `Henno (AKA "H")`, faith story (about 80 words), Harvest Christian Church
- [x] Founder photo: surfing photo in a square frame, served without inline styles (CSP)
- [ ] Footer: social handles for each channel (`footer.social.*`); channels without an address stay hidden
- [ ] Start here (the gospel in 4 steps): read by a pastor or elder before launch
- [ ] Final check that the copy reads without any `[brackets]` visible on the live page

---

## C. Sign-up form (PLAN 1.3, UI part)

Needs the API endpoint first. See PLAN.md 1.3 for the backend work.

- [ ] Sign-up section or block placed where the mockup puts it, linked from the header CTA ("Get the devotional") and hero
- [ ] Fields: first name (optional, `autocomplete="given-name"`), email (required, `type="email"`, `inputmode="email"`, `autocomplete="email"`)
- [ ] Visible labels, not placeholder-only
- [ ] Consent line next to the button, wording versioned
- [ ] Hidden honeypot field and Turnstile widget (CSP already allows `challenges.cloudflare.com`)
- [ ] Inline errors announced via `aria-live`, built on the existing `FieldError`
- [ ] Submit button shows a pending state and blocks double submits
- [ ] Works before JavaScript hydrates (Server Action, progressive enhancement)
- [ ] Success state: same "check your inbox" message for every outcome, no hint whether the email is known
- [ ] Rate-limit and server-error states show a calm, generic message
- [ ] Branded thank-you page shown after Kit confirmation
- [ ] Checked at 375px, with the on-screen keyboard open, in light and dark

---

## D. Prayer request form (PLAN 1.4, UI part)

- [ ] `#contact` section exists (header "Prayer" link and footer already point at it, so they currently go nowhere)
- [ ] Fields: first name (optional), message (required, 2,000 character limit with a live counter), optional email for a reply
- [ ] Consent checkboxes: "OK to email the prayer team" and "I would like a reply"; the default is a decision for **(Hendrik)** (PLAN 1.4)
- [ ] Plain note that the request is private and how long it is kept (90 days)
- [ ] Honeypot, Turnstile, pending state, `aria-live` errors, works without JavaScript
- [ ] Success message that does not repeat the prayer text
- [ ] Checked at 375px with the keyboard open

---

## E. Contact form (PLAN 1.5, UI part)

- [ ] Form in the same section as prayer, clearly separated so people pick the right one
- [ ] Fields: name, email, subject, message, all with limits
- [ ] Same standards as sign-up (labels, errors, honeypot, Turnstile, no-JS)
- [ ] Success and error states

---

## F. Navigation and links

- [ ] Replace the `mailto:` and placeholder addresses with real ones: `prayer@wordonthewater.net`, `hello@wordonthewater.net` (PLAN 1.6)
- [ ] Footer: privacy policy link once the page exists
- [ ] Footer: "full statement of faith" link once a page or URL exists
- [ ] Header links all land on a real section (`#contact` is the one missing today)
- [ ] Active or focus state on the in-page links; smooth scroll respects reduced motion
- [ ] Anchor targets are not hidden under the sticky header (scroll margin)
- [ ] 404 and error pages reviewed in both themes

---

## G. Privacy page and trust (PLAN 1.6, UI part)

- [ ] Privacy policy page that matches `docs/privacy.md` **(Hendrik: review)**
- [x] ESV copyright notice re-checked against the Crossway API terms (2026-11-07); re-check if the copy or scripture use grows (500 verses or half a book per page, non-commercial only)
- [ ] `security.txt` served at `/.well-known/security.txt`

---

## G2. Devotional page (built, `/devotionals/<slug>`)

- [x] Page built from `content/devotionals` and `content/series`, matching the approved mockup (crumbs, hero art, Conditions, Lineup, Word, Paddle Out, Pray, Go Deeper, verse card, series nav, surf report, series list)
- [x] Landing card opens the full devotional
- [x] Light and dark art and verse cards follow the theme
- [x] No inline styles (CSP), no console errors, e2e on five browser projects
- [x] Header fits 320 to 414px wide with its right margin intact (it overflowed by 12px at 360 and 375px). Tested at plain window widths, because the iPhone and Pixel e2e profiles widen themselves and cannot show a sideways scroll
- [x] Hero: the big logo is hidden below 768px, because the menu bar already shows it, and the verse text sits just under the menu bar. From 768px the logo stays in the right column
- [x] Series list goes back through published weeks (and forward once published); the landing card follows the calendar; both tested with `DEVOTIONAL_TODAY`
- [x] The What's coming status no longer carries a date: it reads "Rolling in consistently"
- [ ] Sign-up form in the closing band (arrives with 1.3; today it is a Subscribe button)
- [x] On phones the surf report stays above the article and the series list sits below it; on wide screens both stay in the side column
- [ ] Mark up the page for search (JSON-LD `Article`) with step 1.6
- [ ] Check at 820px and 1440px, and on a real phone

---

## H. Installable app and share look (PLAN 1.6, UI part)

- [ ] `app/manifest.ts` with name, short name, colours from the tokens, shortcuts (Start here, Prayer request)
- [ ] Icons: 192 and 512 px, 512 px maskable, `icon.svg`, `apple-icon.png` (180 px), drawn from the inline logo
- [ ] Narrow 375px screenshots for the Android install sheet
- [ ] `metadata.appleWebApp` for the iOS home-screen launch
- [ ] Open Graph image (1200x630) and a check of the share preview
- [ ] Theme colours in the manifest follow the active scheme

---

## I. Visual polish and consistency

- [ ] Compare each section against `docs/design/A. Night swell@2x.png` and `B. Dawn patrol@2x.png` (both are committed)
- [ ] Light and dark pass over every section, including the new forms
- [ ] Text contrast checked for both schemes (WCAG 2.2 AA)
- [ ] Devotional text uses Lora at a `62ch` measure, base size 16px or more
- [ ] Spacing, heading sizes and button styles consistent across sections
- [ ] No layout shift from fonts or images
- [ ] Check at 320, 375, 414, 768, 1024 and 1280 widths, portrait and landscape on a phone
- [ ] Notch and home-indicator safe areas checked on a real iPhone

---

## J. Accessibility (WCAG 2.2 AA)

- [ ] `@axe-core/playwright` on every page, zero serious or critical (PLAN 1.8)
- [ ] One `h1`, logical heading order, landmarks present
- [ ] Keyboard-only pass: menu, theme toggle (header from `lg`, menu row below), all three forms, skip link
- [ ] Visible focus on every interactive element in both themes
- [ ] Form errors reachable by screen reader and focus moves to the first error
- [ ] VoiceOver (iOS) pass and TalkBack (Android) pass

---

## K. Performance and device checks (PLAN 1.8)

- [ ] Lighthouse CI mobile: Performance 95+, Accessibility 100, Best Practices 100, SEO 100
- [ ] LCP under 2.0 s, CLS under 0.05, INP under 200 ms
- [ ] Landing JS under 100 KB gzipped (the Turnstile and form code count)
- [ ] LCP measured on a deployed preview, not only locally (pages render per request, ADR 0007)
- [ ] Real mid-range Android phone check
- [ ] Install test: Android Chrome "Install app" and iOS Safari "Add to Home Screen" (icon, name, splash colours, standalone launch)
- [ ] Playwright e2e on iPhone SE, iPhone 13, Pixel 7, and desktop Chromium, WebKit and Firefox

---

## L. Final sign-off

- [ ] `pnpm check:placeholders` reports nothing
- [ ] A visitor on a mid-range phone can read the page, subscribe and confirm, and send a prayer request
- [ ] Both themes reviewed end to end on a real phone and a desktop browser
- [ ] No console errors and no CSP violations on the production domain
