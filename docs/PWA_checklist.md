# PWA checklist

Step by step plan to make Word on the Water an installable web app (a PWA). It expands Part C of [production_checklist.md](production_checklist.md) (the PWA items that used to be in [PLAN.md](PLAN.md) sections 1.6 and 1.8; the conversion is a launch-time step now), and follows [CLAUDE.md](../CLAUDE.md) sections 5 and 9. Before writing code, read the bundled Next.js docs: `apps/web/node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`, `.../03-file-conventions/01-metadata/manifest.md` and `.../app-icons.md`.

**Scope (Phase 1):** installable, full-screen, with the right icon, name and colours. **Not in scope:** offline reading and a service worker (Phase 3), Web Push (Phase 2 gate), a native app (see [FLUTTER.md](FLUTTER.md)).

**How it works in one paragraph:** a phone offers to install a site that is served over HTTPS and has a web app manifest (name, start page, `display: standalone`, colours and icons of 192 and 512 px, one of them maskable). Android Chrome shows an "Install app" prompt. iPhone Safari has no prompt: Share, then Add to Home Screen, and it uses the 180 px apple icon. The installed app is the live website, so every deploy updates it with no store review.

**Working rules for each step:** one branch per section (branch name 36 characters or fewer, for example `feat/pwa-manifest`), tests first, one commit per step, `make lint typecheck test` before the PR, and `make e2e` for the UI steps.

---

## 1. Decisions to confirm first

- [ ] Source of the icon: use the existing inline SVG logo (the ring, wave and cross in the header) **(Hendrik: confirm, or supply a master SVG or a 1024 px PNG)**
- [ ] App names: `name` "Word on the Water", `short_name` "WotW" (the short name is what shows under the home screen icon; confirm it is not too cryptic)
- [ ] Icon background colour: Dawn patrol `#fbf3e8` or the deep navy `#0f2233`, and whether one icon is enough for both schemes (manifest icons cannot change with the theme)
- [ ] Start page: `/` for everyone, with shortcuts to Start here and Prayer request (the Bible shortcut only once `BIBLE_ENABLED` is on in production)
- [ ] Orientation: portrait only, or leave it open (the Bible reader is fine in landscape on a tablet)

## 2. Icons

- [ ] Export the logo as a standalone SVG with no CSS variables (fixed colours), in `apps/web/src/app/icon.svg`
- [ ] Generate `icon-192.png` and `icon-512.png` (`purpose: "any"`) from it into `apps/web/public/icons/`
- [ ] Generate `icon-maskable-512.png` with the logo inside the central 80% safe zone and a full-bleed background colour
- [ ] Generate `apple-icon.png` at 180 px (`apps/web/src/app/apple-icon.png`), full-bleed with no transparency (iOS fills transparent areas with black)
- [ ] Keep `favicon.ico` as it is
- [ ] Put the generation in a small script (`apps/web/scripts/make-icons.mts`, run with pnpm) so the icons can be rebuilt when the logo changes; commit the PNGs it produces
- [ ] Check each icon by eye on a light and a dark background, and in the maskable preview at https://maskable.app
- [ ] Commit: `feat(web): app icons`

## 3. Manifest (test first)

- [ ] Write the unit test `tests/unit/manifest.test.ts` first and see it fail: required fields exist, `display` is `standalone`, `start_url` and `scope` are `/`, icons include 192 and 512 `any` and a 512 `maskable`, `theme_color` and `background_color` equal the token values in `src/lib/theme.ts` and `tokens.css`
- [ ] Create `apps/web/src/app/manifest.ts` returning `MetadataRoute.Manifest`:
  - [ ] `name`, `short_name`, `description` (one plain sentence), `lang: "en"`
  - [ ] `id: "/"`, `start_url: "/"`, `scope: "/"`
  - [ ] `display: "standalone"`, `orientation` as decided above
  - [ ] `background_color` and `theme_color` from the tokens (import the values, never retype hex codes)
  - [ ] `categories: ["lifestyle", "education"]` (check the allowed list; keep only well-known values)
  - [ ] `icons` for the four PNGs above, with the correct `sizes`, `type` and `purpose`
- [ ] Open `http://localhost:3000/manifest.webmanifest` and read the JSON
- [ ] The unit test passes
- [ ] Commit: `feat(web): web app manifest`

## 4. Shortcuts and screenshots

- [ ] `shortcuts`: "Start here" (`/#start`) and "Prayer request" (`/#contact`), each with a short name and a 96 px icon (long-pressing the icon on Android lists them); add "Bible" only behind the same `BIBLE_ENABLED` flag
- [ ] `screenshots`: at least one narrow (`form_factor: "narrow"`, 375 x 812 or similar, PNG) of the landing page and one of the Bible reader, taken from the real site in Dawn patrol (Android shows these on the richer install sheet)
- [ ] Add `label` and `type: "image/png"` to every screenshot
- [ ] Extend the unit test: shortcut URLs are inside `scope`, every screenshot has `sizes` and `type`
- [ ] Commit: `feat(web): manifest shortcuts and screenshots`

## 5. iOS and the viewport

- [ ] In `layout.tsx` add `metadata.appleWebApp`: `capable: true`, `title: "Word on the Water"`, `statusBarStyle: "default"` (try `black-translucent` only if the header handles the status bar area)
- [ ] Confirm the existing `viewport` already has `viewportFit: "cover"` and `themeColor` per colour scheme (it does); keep the safe-area padding on the header, the Bible sheet and the chapter bar
- [ ] Check that links to other sites open in the browser and not inside the installed window (the ESV link, social links); same-site links stay inside
- [ ] Commit: `feat(web): iOS home screen metadata`

## 6. Security headers and CSP

- [ ] Confirm the nonce CSP in `src/proxy.ts` does not block the manifest or icons (they are same-origin, so `default-src 'self'` and `img-src 'self' data:` cover them)
- [ ] Confirm `/manifest.webmanifest` and `/icons/*` are not caught by the proxy matcher in a way that breaks them (check the matcher)
- [ ] Write the e2e test `tests/e2e/pwa.spec.ts` first: `/manifest.webmanifest` returns 200 with a manifest content type, every icon and screenshot URL in it returns 200 with an `image/png` type, and no CSP violation is logged on the page (the `link rel="manifest"` and apple icon are in the head)
- [ ] Run it on all six projects with `make e2e` (Firefox runs in CI only on the current macOS beta)
- [ ] Commit: `test(web): manifest and icons load under the CSP`

## 7. Check it in the browser (desktop)

- [ ] `pnpm build && pnpm start` and open the site in Chrome
- [ ] DevTools, Application, Manifest: no errors or warnings, the icons and the maskable preview show, "Installability" says the page can be installed
- [ ] Click the install icon in the address bar, install, and check it opens in its own window with the right name and icon
- [ ] Uninstall it again

## 8. Check it on a real phone

HTTPS is needed. Use a Vercel preview deployment (the best test, the real production build) or an ngrok tunnel to `pnpm start`. For `pnpm dev` over Wi-Fi, `DEV_ORIGINS` in the root `.env` is enough to open the site but it is plain HTTP, so install does not work there.

- [ ] Deploy a preview (open the PR; Deployment Protection may ask you to log in) **(Hendrik: Vercel preview settings)**
- [ ] **Android Chrome:** the Install app prompt or menu item appears; install; icon and name on the home screen; opens full screen with the right splash colour; long-press shows the shortcuts
- [ ] **iPhone Safari:** Share, Add to Home Screen; icon, name and no black corners on the icon; opens full screen; the status bar and the notch do not cover the header
- [ ] The theme colour of the browser bar follows light and dark
- [ ] Links, the menu, the Bible picker sheet and the chapter bar all work in the installed window (there is no browser Back button on iPhone, so every page must have a way back inside the page)
- [ ] Rotate the phone and check nothing breaks
- [ ] Note any problem in the PR

## 9. Docs and PLAN.md

- [ ] Tick the PWA items in [PLAN.md](PLAN.md) 1.6 and the Installability item in 1.8 as each is verified
- [ ] Add a line to the README: how to install the site on a phone (two sentences)
- [ ] Update `CLAUDE.md` (the status line and the repository layout: `manifest.ts`, `apple-icon.png`, `public/icons`, `scripts/make-icons.mts`)
- [ ] Open the PR with phone screenshots (install prompt and the home screen icon) and merge only when every check is green

## 10. Later (not Phase 1)

- [ ] Phase 2 gate: Web Push for the weekly devotional (a service worker, a push subscription store, a send job; on iPhone push only works for a site added to the home screen on iOS 16.4 or newer)
- [ ] Phase 3: offline reading of recent devotionals and the last Bible chapters: `public/sw.js` served with `Cache-Control: no-cache` and its own CSP header, a cache and update strategy, an offline page, and a test that a published devotional still opens with the network off
- [ ] Phase 3: an "Install" button inside the page that uses the `beforeinstallprompt` event on Android (iPhone needs written instructions instead)
- [ ] Revisit the native Flutter app at the Phase 2 gate ([FLUTTER.md](FLUTTER.md), option B)
