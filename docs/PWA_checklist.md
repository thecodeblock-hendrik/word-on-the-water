# PWA checklist

**Status (2026-11-17): built, waiting for the install checks.** Sections 1 to 6 and the docs of section 9 are done on PR #136 (icons, manifest, shortcuts, screenshots, iOS settings, e2e test). What is left is the desktop check (7) and the real phone checks (8) on the PR preview, then the merge. Launch is Saturday 28 November 2026. Ticks here are mirrored in Part C of [production_checklist.md](production_checklist.md), which is the list the launch follows.

Step by step plan to make Word on the Water an installable web app (a PWA). It expands Part C of [production_checklist.md](production_checklist.md) (the PWA items that used to be in [PLAN.md](PLAN.md) sections 1.6 and 1.8; the conversion is a launch-time step now), and follows [CLAUDE.md](../CLAUDE.md) sections 5 and 9. Before writing code, read the bundled Next.js docs: `apps/web/node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`, `.../03-file-conventions/01-metadata/manifest.md` and `.../app-icons.md`.

**Scope (Phase 1):** installable, full-screen, with the right icon, name and colours. **Not in scope:** offline reading and a service worker (Phase 3), Web Push (planned after the PWA, [web_push.md](web_push.md)), a native app (see [FLUTTER.md](FLUTTER.md)).

**How it works in one paragraph:** a phone offers to install a site that is served over HTTPS and has a web app manifest (name, start page, `display: standalone`, colours and icons of 192 and 512 px, one of them maskable). Android Chrome shows an "Install app" prompt. iPhone Safari has no prompt: Share, then Add to Home Screen, and it uses the 180 px apple icon. The installed app is the live website, so every deploy updates it with no store review.

**Working rules for each step:** one branch per section (branch name 36 characters or fewer, for example `feat/pwa-manifest`), tests first, one commit per step, `make lint typecheck test` before the PR, and `make e2e` for the UI steps.

---

## 1. Decisions to confirm first

- [x] Source of the icon (decided 2026-11-17: the existing logo, from `logo.tsx`): use the existing inline SVG logo (the ring, wave and cross in the header) **(Hendrik: confirm, or supply a master SVG or a 1024 px PNG)**
- [x] App names (decided 2026-11-17): `name` "Word on the Water", `short_name` "WotW" (the short name is what shows under the home screen icon; confirm it is not too cryptic)
- [x] Icon background colour (decided 2026-11-17: Night swell navy `#0f2233`, one icon for both schemes): Dawn patrol `#fbf3e8` or the deep navy `#0f2233`, and whether one icon is enough for both schemes (manifest icons cannot change with the theme)
- [x] Start page (decided 2026-11-17): `/` for everyone, with a shortcut to Start here (and a Bible shortcut: the Bible reader is on in Production since 2026-11-16)
- [x] Orientation: **no lock** (decided 2026-11-16). Leave `orientation` out of the manifest, so the default (`any`) applies. A portrait lock fails WCAG 1.3.4 (technique failure F97), which this project targets at level AA, and nothing here needs a fixed orientation; users with a mounted device, for example on a wheelchair, can be blocked by a lock. `CLAUDE.md` section 5 and Part C of the production checklist say the same
- [x] **Decided 2026-11-17: no offline page now**; decide it together with Web Push and Phase 3 (the service worker is shared). Was open: offline (now shared with Web Push: [web_push.md](web_push.md) needs the same single service worker file, so decide the two together). Without a service worker the installed app opens to the browser's offline error page when there is no signal, which beach readers will meet. Chrome and MDN do not require a service worker to install. Phase 3 plans offline reading (step 10); decide whether a minimal offline fallback page (a small service worker that precaches one page, served with `Cache-Control: no-cache` and its own CSP) should come now instead
- [x] **Decided 2026-11-17: skip iOS launch screens for now.** Was open: iOS launch screen. Safari does not build a splash screen from the manifest, so without `apple-touch-startup-image` links the app shows a plain launch screen (possibly a white flash in the dark theme). Next supports `appleWebApp.startupImage` with one image per device size. Decide: skip it, or generate a few common sizes in the icon script
- [x] **Decided 2026-11-17: no wide desktop screenshot.** Was open: desktop install sheet. Chrome shows only screenshots with `form_factor: "wide"` on desktop, and step 4 plans narrow ones only. Decide whether one wide screenshot is worth adding (optional)

## 2. Icons

- [x] Export the logo as a standalone SVG with no CSS variables (fixed colours), in `apps/web/src/app/icon.svg`
- [x] Generate `icon-192.png` and `icon-512.png` (`purpose: "any"`) from it into `apps/web/public/icons/`
- [x] Generate `icon-96.png` for the Start here shortcut (step 4)
- [x] Generate `icon-maskable-512.png` with the logo inside the central 80% safe zone and a full-bleed background colour
- [x] Generate `apple-icon.png` at 180 px (`apps/web/src/app/apple-icon.png`), full-bleed with no transparency (iOS fills transparent areas with black)
- [x] Keep `favicon.ico` as it is
- [x] Put the generation in a small script (`apps/web/scripts/make-icons.mts`, run with pnpm) so the icons can be rebuilt when the logo changes; commit the PNGs it produces
- [x] Check each icon by eye on a light and a dark background, and in the maskable preview at https://maskable.app
- [x] Commit: `feat(web): app icons` (2026-11-17: master `src/app/icon.svg` on the Night swell navy with the logo's own paths; `pnpm make:icons` renders every PNG with sharp; `tests/unit/icons.test.ts` checks sizes, no transparency, the maskable safe zone and fixed colours. The maskable icon scales the mark to 66% so even the wave tail stays inside the safe circle. Checked by eye; the maskable.app preview is still worth one look)

## 3. Manifest (test first)

- [x] Write the unit test `tests/unit/manifest.test.ts` first and see it fail: required fields exist, `display` is `standalone`, there is no `orientation` member, `start_url` and `scope` are `/`, icons include 192 and 512 `any` and a 512 `maskable`, `theme_color` and `background_color` equal the token values in `src/lib/theme.ts` and `tokens.css`
- [x] Create `apps/web/src/app/manifest.ts` returning `MetadataRoute.Manifest`:
  - [x] `name`, `short_name`, `description` (one plain sentence), `lang: "en"`
  - [x] `id: "/"`, `start_url: "/"`, `scope: "/"`
  - [x] `display: "standalone"` and no `orientation` member (step 1)
  - [x] `background_color` and `theme_color` from the tokens (import the values, never retype hex codes)
  - [x] `categories: ["lifestyle", "education"]` (check the allowed list; keep only well-known values)
  - [x] `icons` for the four PNGs above, with the correct `sizes`, `type` and `purpose`
- [x] Open `http://localhost:3000/manifest.webmanifest` and read the JSON
- [x] The unit test passes
- [x] Commit: `feat(web): web app manifest` (2026-11-17: `src/app/manifest.ts`, `tests/unit/manifest.test.ts` with 7 tests incl. that every listed icon exists with the size it claims; served as `application/manifest+json` and linked from the head; theme and background colour are both Night swell navy, one pair for both schemes)

## 4. Shortcuts and screenshots

- [x] `shortcuts`: "Start here" (`/#start`) with a short name and a 96 px icon (long-pressing the icon on Android lists it); "Prayer request" is added when that feature is built; add "Bible" (`/bible`; the reader is on in Production since 2026-11-16)
- [x] `screenshots`: at least one narrow (`form_factor: "narrow"`, 375 x 812 or similar, PNG) of the landing page and one of a devotional, taken from the real site in Dawn patrol (Android shows these on the richer install sheet); add one of the Bible reader (it is on in Production since 2026-11-16)
- [x] Add `label` and `type: "image/png"` to every screenshot
- [x] Extend the unit test: shortcut URLs are inside `scope`, every screenshot has `sizes` and `type`
- [x] Commit: `feat(web): manifest shortcuts and screenshots` (2026-11-17: shortcuts Start here and Bible, the Bible entries only while `BIBLE_ENABLED=1` (read when the manifest is built); three 750 x 1624 screenshots in `public/screenshots`, made by `pnpm make:screenshots` against a local production build with `DEVOTIONAL_TODAY=2026-11-28 BIBLE_ENABLED=1`; the Prayer request shortcut waits for 1.4; review page: `docs/design/pwa_screenshots.html`). Retake the screenshots if the landing page, the devotional page or the reader changes visibly

## 5. iOS and the viewport

- [x] In `layout.tsx` add `metadata.appleWebApp`: `capable: true`, `title: "Word on the Water"`, `statusBarStyle: "default"` (try `black-translucent` only if the header handles the status bar area). Checked in Next 16.4.6: `capable: true` emits `mobile-web-app-capable`, and Safari 26 opens any site added to the home screen as a web app anyway, so `capable` is optional
- [x] Confirm the existing `viewport` already has `viewportFit: "cover"` and `themeColor` per colour scheme (it does); keep the safe-area padding on the header, the Bible sheet and the chapter bar
- [x] Check that links to other sites open in the browser and not inside the installed window (the ESV link, social links); same-site links stay inside
- [x] Commit: `feat(web): iOS home screen metadata` (2026-11-17: `appleWebApp` is in `siteMetadata` (`src/lib/seo.ts`) with `capable: true`, `statusBarStyle: "default"` and the title **"WotW"**, not the full name as first written, because iOS cuts a label under the icon at about 11 characters and this matches the manifest short name; change it in one place if you prefer the long name. Rendered head checked on a production build: `viewport-fit=cover`, a `theme-color` per scheme, `mobile-web-app-capable`, the title and the status bar style. No link in the code uses `target="_blank"`, so outside links are left to the installed app, which shows them in the browser's own view; confirm on a phone in step 8. The header needs no top inset with the `default` status bar; the footer, chapter bar and sheets already pad for the bottom)

## 6. Security headers and CSP

- [x] Confirm the nonce CSP in `src/proxy.ts` does not block the manifest or icons (they are same-origin, so `default-src 'self'` and `img-src 'self' data:` cover them)
- [x] The proxy matcher (decided 2026-11-17: leave the matcher as it is; the extra run happens only at install time and does no harm) (checked 2026-11-16) skips only `api/`, `_next/static/`, `_next/image` and `favicon.ico`, so `/manifest.webmanifest`, `/icons/*` and the apple icon go through the proxy and get a nonce and CSP headers. That does no harm; decide whether to add them to the exclusion (fewer per-request runs) or accept it. The e2e test below proves they load either way
- [x] Write the e2e test `tests/e2e/pwa.spec.ts` first: `/manifest.webmanifest` returns 200 with a manifest content type, every icon and screenshot URL in it returns 200 with an `image/png` type, and no CSP violation is logged on the page (the `link rel="manifest"` and apple icon are in the head)
- [x] Run it on all six projects with `make e2e` (the five that run locally pass; Firefox runs in CI) (Firefox runs in CI only on the current macOS beta)
- [x] Commit: `test(web): manifest and icons load under the CSP` (2026-11-17: `tests/e2e/pwa.spec.ts`, 5 tests: the head links, the manifest and its content type, every icon, shortcut icon and screenshot is a loading PNG, every shortcut opens a page, and the page loads every icon with no CSP violation. A mutation check (pointing one icon at a missing file) made it fail with 404, so it does catch a broken manifest)

## 7. Check it in the browser (desktop)

- [ ] `pnpm build && pnpm start` and open the site in Chrome
- [ ] DevTools, Application, Manifest: no errors or warnings, the icons and the maskable preview show, "Installability" says the page can be installed
- [ ] Click the install icon in the address bar, install, and check it opens in its own window with the right name and icon
- [ ] Uninstall it again

## 8. Check it on a real phone

HTTPS is needed. Use a Vercel preview deployment (the best test, the real production build) or an ngrok tunnel to `pnpm start`. For `pnpm dev` over Wi-Fi, `DEV_ORIGINS` in the root `.env` is enough to open the site but it is plain HTTP, so install does not work there.

- [x] Deploy a preview (PR #136, 2026-11-17)
- [ ] Previews are behind Deployment Protection. Next adds `crossorigin="use-credentials"` to the manifest link on Vercel previews (checked in Next 16.4.6, `metadata-elements.js`), so the manifest loads while you are logged in. The icons, and the apple icon iOS fetches, are probably requested without your login and may show as missing. Not confirmed: if they do, test with the protection bypass or on the real domain once it is live (production checklist, Part G) before blaming the icons
- [ ] **Android Chrome:** (2026-11-17: on a phone, the icon and name looked good; the platform and the other points below are still to confirm) the Install app prompt or menu item appears; install; icon and name on the home screen; opens full screen with the right splash colour; long-press shows the shortcuts
- [ ] **iPhone Safari:** Share, Add to Home Screen; icon, name and no black corners on the icon; opens full screen; the status bar and the notch do not cover the header
- [ ] The theme colour of the browser bar follows light and dark
- [ ] Links, the menu, the sign-up form and the `/thank-you` page work in the installed window; Got Questions opens and closes, and the Bible picker sheet, the chapter bar and the Your chat button work too (both features are on in Production, and in previews, where their Vercel variables are also set) (there is no browser Back button on iPhone, so every page must have a way back inside the page)
- [ ] Rotate the phone and check nothing breaks
- [ ] Note any problem in the PR

## 9. Docs and PLAN.md

- [x] Tick the matching items in Part C of [production_checklist.md](production_checklist.md) as each is verified (the PWA items in [PLAN.md](PLAN.md) 1.6 and the Installability item in 1.8 moved there, so PLAN.md has nothing to tick)
- [x] Add a line to the README: how to install the site on a phone (two sentences)
- [x] Update `CLAUDE.md` (the status line and the repository layout: `manifest.ts`, `apple-icon.png`, `public/icons`, `scripts/make-icons.mts`)
- [ ] Open the PR with phone screenshots (PR #136 is open; the phone screenshots come from steps 7 and 8) (install prompt and the home screen icon) and merge only when every check is green

## 10. Later (not Phase 1)

- [ ] Web Push for the weekly devotional, planned after the PWA (decided 2026-11-16): the design and steps are in [web_push.md](web_push.md); it needs a service worker, a subscription store and a send job, and on iPhone it only works for a site added to the home screen on iOS 16.4 or newer
- [ ] Phase 3 (or earlier, see the offline decision in step 1): offline reading of recent devotionals and the last Bible chapters: `public/sw.js` served with `Cache-Control: no-cache` and its own CSP header, a cache and update strategy, an offline page, and a test that a published devotional still opens with the network off
- [ ] Phase 3: an "Install" button inside the page that uses the `beforeinstallprompt` event on Android (iPhone needs written instructions instead)
- [ ] Revisit the native Flutter app at the Phase 2 gate ([FLUTTER.md](FLUTTER.md), option B)
