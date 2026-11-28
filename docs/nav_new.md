# Liquid glass bottom navigation: build plan

Design: [design/landing_nav_new.html](design/landing_nav_new.html). It replaces the raised-tab bar in [landing_page_nav.md](landing_page_nav.md). Build it after the 28 November launch.

**Decided:** light glass in Dawn patrol and dark glass in Night swell; plain chevrons for Previous and Next; no resting pill on any screen; on a devotional page the Devotional button becomes Shore and opens the landing page; the bar hides while the page scrolls, down or up, and returns when the scrolling stops (changed 28 November, after the first phone test). The "Chat cleared" popup becomes a shelf on the bar (option C in [design/new_nav_chat.html](design/new_nav_chat.html), chosen 28 November). Below `lg`, tablets use the same bar; the bar, chat message pill and Undo toast are at most 440px wide and centred (section 13 of the mockup).

**Unchanged:** routes, what the other buttons do, clearing the chat with Undo, hiding for the chat keyboard, and everything from `lg` up (including the desktop chapter buttons and the "Your chat" edge tab). The bar still needs both `BIBLE_ENABLED` and `CHAT_ENABLED`.

## How to work

- One branch for the whole plan (`feat/liquid-glass-nav`), one commit per step with its box ticked. Merge only when the plan is done.
- Push only when the whole build is complete (decided 27 November, after the step 0 push). CI does not run until then, so the local checks after each step matter; desktop Firefox is only checked by CI.
- In each step: write the tests, see them fail for the right reason, write the code, see them pass.
- A step that breaks an old test updates it in the same commit.
- End every step with `make lint typecheck test`, plus the named e2e spec when there is one, and a look at 375px in light and dark.
- After changing `globals.css`, delete `apps/web/.next` before judging the result. In step 6 an incremental build left out the new nested rules; a clean build had them (why the cache did not refresh is not known). At the final push, also check them in the preview's CSS.
- Read the bundled Next docs before using a Next API. Add no animation library.
- Unit tests live in `apps/web/tests/unit`, e2e specs in `apps/web/tests/e2e`.
- Tablet tests set the viewport to 744 x 1133 and 820 x 1180 inside the spec; no new Playwright project. Run them in one mobile Chromium and one mobile WebKit project (`pixel-7`, `iphone-13`). Use a maximum width, not a new breakpoint.

## Part 1: the glass bar (no movement yet)

- [x] **0. Baseline.** Run `make lint typecheck test e2e`. Make the CI Lighthouse job run with `BIBLE_ENABLED=1` and `CHAT_ENABLED=1` (open item in PLAN.md 1.10b). Record landing JS size (budget 165 KB gzipped), LCP, CLS and TBT.
  - Done when: everything is green and the figures are written under "Measurements".

- [x] **1. Glass surface.** One shared set of classes for the capsule (64px high, 16px side margins, 72% surface tint, blur, rim, shadow), built only from design tokens.
  - Test first: a contrast test that reads `tokens.css` and proves ink labels reach 4.5:1 on the glass over black (light) and white (dark), and on the pill.
  - Done when: the test passes in both schemes.

- [x] **2. Site bar.** `BottomNav` becomes three equal tabs in the capsule, for both the site and chat variants. On a devotional page (`/devotionals/...`) the site bar shows Shore, linking to `/`, in place of Devotional; the chat bar does not change. No tab is ever marked current. Page bottom padding in `layout.tsx` fits the floating bar and the safe area.
  - Test first (`bottom-nav.test.tsx`, `bottom-nav-host.test.tsx`): capsule, `lg:hidden`, three tabs, no raised circle, no accent fill, Shore instead of Devotional on a devotional page only, no `aria-current` anywhere, 440px maximum width and centred. In `bottom-nav.spec.ts`, replace the current-page check with: Shore on a devotional goes to `/`. In `bottom-nav.spec.ts`, at 744 and 820 wide the bar is 440px with equal space on both sides.
  - Done when: unit tests and `bottom-nav.spec.ts` pass, and the footer scrolls clear of the bar.

- [x] **3. Chat spacing and Undo toast.** The message pill sits 12px above the capsule. The toast becomes a capsule 12px above the bar.
  - Test first: `chat-input-pill.test.tsx`, `undo-toast.test.tsx`, and in `bottom-nav.spec.ts` replace the bump check with "the toast and message pill do not overlap the bar". At 744 and 820 wide, the pill and the toast are 440px, centred and in line with the bar.
  - Done when: both pass, the keyboard still hides the bar, the pill and toast look as before at 375px, the chat thread is unchanged, and the desktop drawer looks as before.

- [x] **4. Bible reader bar.** Below `lg`, `ChapterNav`, `ShoreButton` and `ChatReturn` use the capsule: a chevron above the short name ("John 2"), with Shore or Your chat in the middle. Disabled ends read "Start" and "End". Use one bottom padding rule in place of the extra `--chat-extra` space.
  - Test first (`bible-chapter-nav.test.tsx`, `shore-button.test.tsx`, `chat-return.test.tsx`): chevrons and short names on phones; spoken names "Previous chapter: John 2", "Start of the Bible", "End of the Bible"; desktop classes and text unchanged. Update the old geometry checks in `chat.spec.ts`. At 744 and 820 wide, the reader bar is 440px and centred.
  - Done when: the specs pass, no label wraps or is cut off for any book at 320px, and arrow keys still change chapter.

- [x] **5. Remove the old shape.** Delete `RaisedBump` and any unused classes and attributes.
  - Done when: a search finds no `RaisedBump`, `data-bump` or `data-chat-bump`, and the full e2e run is green.
  - Result (local, 27 November): the search is clean. Five projects in parallel: 1,019 passed, 218 skipped, 13 WebKit failures in tests outside the bar (as in the step 0 baseline), all passing one at a time. Not proven: why WebKit fails in parallel on this Mac. Desktop Firefox and a clean parallel run are left to CI at the final push.

- [x] **6. Solid fallbacks.** Solid bar for reduced transparency, increased contrast and no `backdrop-filter`; system colours in forced-colours mode.
  - Test first: e2e with emulated contrast, forced colours and reduced transparency (Chromium emulates it, so no hand check); a browser without blur cannot be emulated, so a unit test and a look at the built CSS cover that rule.
  - Done when: axe is clean on every page with the bar, in light and dark.

## Part 2: liquid movement

- [x] **7. Spring maths.** A pure module in `src/lib/nav/`: one step moves the pill's left and right edges. The leading edge is stiffer (520, damping 34) than the trailing edge (190, damping 21). Vertical squash never goes below 0.82.
  - Test first: fixed time steps, no real clock. It stretches in both directions, overshoots a little, settles exactly on the target and stops; a long frame cannot make it fly off.
  - Done when: unit tests pass.

- [x] **8. Pill on tap and keyboard.** A small client hook moves one pill element with `requestAnimationFrame`. Set styles from JavaScript only: the nonce CSP blocks server-rendered `style` attributes. Links stay real links and navigation is never delayed. The pill fades out afterwards. Reduced motion moves it with no stretch.
  - Test first: tap, Enter, the fade afterwards, reduced motion, animation stops on unmount. Ask the Word still opens the chat in place.
  - Done when: the pill shows on the tapped tab and fades, there are no CSP errors (`csp.spec.ts`) and landing JS is within budget. It does not need to flow into the Bible reader or the chat, which have their own bars.
  - Result: landing JS 164,289 bytes, 4,671 under the limit. Found and fixed: iPhone WebKit starts a native link drag when a press moves off a tab, then sends neither `pointerup` nor `pointercancel`, so the pill stayed on. The bar now cancels `dragstart` (this was the link dragging part of step 9; link previews are still to do).

- [x] **9. Hold and slide.** The pill follows the finger; releasing over a tab opens it, releasing outside cancels. A native click does not fire when the press ends on a different link, so call that link's `click()` once. Stop iOS link previews and link dragging on the bar.
  - Test first: slide to another tab, release outside, `pointercancel`, disabled tab, plain tap opens only once.
  - Done when: unit tests and a new e2e journey pass on the three phone projects.
  - Result: unit tests and journeys pass on the three phone projects, with real touch sequences in Chromium (a 14px slide over a tab boundary opens one page). After a slide the bar opens the tab itself and blocks the browser's own click, so it opens once. Link previews cannot be tested in an emulator (step 13). Landing JS 164,668 bytes, 4,292 under the limit.

## Part 3: hide while scrolling

- [x] **10. The rule.** A pure function in `src/lib/nav/`: shown within 8px of the top or 24px of the end; hidden after more than 40px down; shown after 4px or more up; positions are clamped so the iPhone bounce is ignored; a page too short to scroll never hides.
  - Test first: one case for each rule, plus small jitters in both directions.
  - Done when: unit tests pass.

- [x] **11. Connect it.** A passive window scroll listener for the site and reader bars, not the chat bar. The state resets on every new page or chapter. The bar slides in 200ms (no slide with reduced motion). The toast stays and moves into the bar's place. The hidden bar is not `inert` or `aria-hidden`; keyboard focus (`:focus-visible`) shows it. Page padding does not change. Desktop never hides.
  - Test first: unit tests for the reset and the chat exception; e2e on the phone projects for hide, return, end of page, keyboard focus, the toast, the reader and reduced motion.
  - Done when: the e2e journeys pass without fixed sleeps and CLS is unchanged.
  - Result: journeys pass on the three phone projects (keyboard focus in Chromium only: Safari does not Tab to links). The hidden bar moves by its height, its distance from the edge (with the home indicator) and its shadow; the mockup's height plus 24px would have left a strip showing on an iPhone, which only a real phone can confirm (step 13). The watcher is mounted whenever the Bible reader is on, since the reader has its bar without the chat. Two older tests were updated: one tapped the bar while it is now hidden, one measured it mid-slide after a fixed wait. Local Lighthouse: CLS 0.0002 and 0.0001, as at step 0; LCP 1.63 s and 1.62 s. Landing JS 164,948 bytes, 4,012 under the limit.
  - Change after the first phone test (28 November): the bar stayed away after scrolling down stopped. It now returns once no scroll event has arrived for 400 ms (600 ms at first, shortened the same day; `RETURN_AFTER` in `follow-scroll.ts`, a timer, so it does not depend on the `scrollend` event), and hides again after another 40px down. Browser tests that need the bar to stay away hold back that one timer.
  - Second change the same day: scrolling up no longer shows the bar at once. It hides after more than 40px of scrolling either way from where it was last shown, and returns on stopping, or at the top (8px) or end (24px) of the page. This replaces the step 10 rule that 4px or more up shows it. Full run on five projects: 1,090 passed, 310 skipped, none failed; 1,011 web unit tests pass.

## Part 4: the Undo shelf (option C)

Design: option C in [design/new_nav_chat.html](design/new_nav_chat.html). After the chat is left, the bar grows a 52px shelf with "Chat cleared" and Undo, as one piece of glass, then settles back. Build it before step 13, so the phone checks cover it. Steps are numbered S1 to S6.

**Unchanged:** when it appears (only with an answer or a draft to lose), the 8 seconds, Undo itself, the memory-only copy, the wording, the spoken announcement, all tabs, page padding, the chat screen and desktop.

**How to build it.** The shelf is not put inside the `<nav>` elements. `UndoToast` stays where it is, once in the layout, and becomes the glass pane: it sits just behind the bar and reaches from the bar's bottom edge to 52px above its top. While it is there, the bar drops its own glass (CSS `:has`), so only one pane is drawn. The bar's markup does not change. Reasons, from reading the code:

- The announcement works because the `role="status"` area stays in the page while pages change. A shelf inside a bar would be created already filled on a new page or chapter, which screen readers may not announce.
- The liquid pill and hold and slide treat every link and button in a bar as a tab (`tabs.ts`, matched by horizontal position). Undo inside the bar would become a fourth tab lying over the others.
- A `/bible/...` address that is not found has no bar at all (`BottomNavHost` leaves `/bible` out, and there is no chapter bar). A separate pane can still offer Undo there, on its own.

**Two differences from the mockup:**

- While Undo has focus, the ring shows full and starts again on leaving, because the real timer gives a full 8 seconds again. The mockup's ring resumes where it paused.
- While scrolling, the bar slides away as it does now and the pane shrinks to the shelf in the bar's place. The mockup folds the tabs; the result looks the same.

- [x] **S1. Prove the one pane.** A throwaway check before any app code: a page with the real `glass-bar` styles, a pane behind it and the bar's glass switched off, on mobile Chromium and WebKit, light and dark.
  - Check: no seam, double blur or double shadow where tabs meet shelf; text behind is blurred under both parts; the pill still shows behind its tab.
  - Done when: screenshots show one piece of glass. If they do not, stop and decide the approach again before S2.
  - Result (local, 28 November): passed, with the blur in WebKit still to be seen on an iPhone. The prototype added a 116px pane to the running production build from the test browser (no app code changed), on mobile Chromium and WebKit, light and dark, site bar and Bible reader bar. One pane: with its tabs hidden, the bar's box changed 0 pixels in all 8 views in 3 runs; the control, with the bar's glass left on, changed 15,000 to 35,000. Chromium blur: over 6px black and white stripes the swing fell from about 250 outside to 3 on the shelf, 3 at the join and 5 on the tabs. The pill still shows behind a pressed tab. The pane's top is 52px above the bar's.
  - Not shown: WebKit here draws no blur, headless or in a window, even for the bar already built (its computed style still says `blur(18px)`). Check the shelf's blur on an iPhone (step 13).
  - For S2: the rule that switches off the bar's glass beat both `glass-bar` and the reader's `max-lg:glass-bar` when it was not in a layer. The pane needs the glass surface only, not `glass-bar`'s padding, fixed height or `touch-action: none`, so share the surface between the two. Screenshot comparisons must wait for the redraw after a style change; without that the first runs showed false differences.

- [x] **S2. The shelf, standing still.** The pane joins the bar below `lg`: same width and edges (440px at most), 52px shelf, a hairline above the tabs, Undo in a lens at least 44px high. The old navy popup style and any unused `toast-in` animation go.
  - Test first (`undo-toast.test.tsx`, `glass.test.ts`): glass classes, not the navy ones; still one `role="status"` that is there and empty before anything is cleared; Undo is outside both bars; the CSS that switches off the bar's glass applies below `lg` only and only while the shelf is there; label contrast on the lens reaches 4.5:1 in both schemes.
  - Test first (`bottom-nav.spec.ts`, replacing "clear of the bar"): shelf and bar meet with no gap or overlap of tabs and Undo, on the site bar and the Bible reader's bar, at 320, 375, 744 and 820 wide. All three tabs and Undo can be tapped. A slide along the bar never reaches Undo.
  - Done when: those pass, axe is clean in light and dark with the shelf open, and without a shelf the bar looks exactly as before.
  - Result (local, 28 November): done. The glass is now `glass-surface`, which `glass-bar` applies. With no shelf, the bars are unchanged to the pixel from the build before (8 views: site and reader, light and dark, Chromium and WebKit, 0 pixels differ). Full run on five projects: 1,090 passed, 320 skipped, none failed; the shelf tests 380 of 380 over 10 repeats; 1,019 web unit tests, lint and types pass. `toast-in` and `data-follows-bar` are gone.
  - Built early from S3, because the old scroll test and a working shelf needed it: the pane is the shelf alone (54px) by default, 116px where there is a bar, and shrinks while the bar is away. S3 still has to prove keyboard focus, the missing `/bible` page, the chat and the repeats.
  - Found on the way: the new reader test failed now and then (50.98px instead of 52). Going from the site bar to the reader on a slow connection there is a moment on `/bible` with no bar (`BottomNavHost` leaves `/bible` out before the reader's bar is there, as before this work), so the shelf shrinks to itself and grows back. Reproduced 24 of 24 with a 700 ms delay and the shelf's animation slowed to 3 s; the test now waits for the joined height, and passed 24 of 24 under the same forcing. The visible dip is still there.

- [x] **S3. Scrolling, focus and no bar.** Scrolling moves the bar away and leaves the shelf, with all corners round, in its place; stopping joins them again.
  - Test first (`bottom-nav.spec.ts`, updating "drops into the bar's place"): shelf alone while away and joined again after; keyboard focus in the hidden bar brings both back joined; focus on Undo keeps working while scrolling; on a `/bible` address that is not found, the shelf stands alone with Undo; opening the chat removes it and the chat's bar keeps its own glass.
  - Done when: those pass on the three phone projects, repeated five times.
  - Result (local, 28 November): done. The styles built early in S2 needed no change; S3 added the browser tests. The selected tests passed 720 of 720 over 10 repeats on the three phone projects (keyboard focus in the bar in Chromium only: Safari does not Tab to links). Since the behaviour was already there, the tests were checked by breaking it: no shrink while away, a tall pane with no bar, no keyboard exception, a hairline left behind and a chat that keeps the shelf were each caught. From the chat the reader opens at John 3:16 alone, which cannot scroll, so the reader tests move to John 4 first. Full run on five projects: 1,118 passed, 342 skipped, none failed; 1,024 web unit tests, lint and types pass.
  - Also fixed, before S3: the gap with no bar on the way into the reader (see S2). `BottomNavHost` now keeps the bar of the page before while the address is `/bible`, which only redirects; Shore stays Shore. A slow-connection test records every frame: it showed `NO BAR` before the fix. Following `/bible` from inside the reader still shows no bar until the chapter arrives, as before.
  - Two test faults fixed: the not-found test counted a 0px line as a hairline, so it passed only when read while the page was still moving (failed 20 of 20 once settled); and the older sign-up test could read a neighbour's sign-up from the stub, which kept one for all tests (reproduced 3 of 3).

- [x] **S4. Countdown ring.** A ring with an undo arrow inside Undo, emptying over the 8 seconds. Decoration only (`aria-hidden`); the button's name stays "Undo". Animate with CSS classes, since the CSP blocks `style` attributes.
  - Test first: the ring's time comes from the same value as the timer; it is full and still while Undo has focus and starts again on leaving; **with reduced motion it stays full** (the global reduced motion rule would otherwise empty it at once); the existing 8 second and focus tests stay green.
  - Done when: unit tests pass and `csp.spec.ts` is clean.
  - Result (local, 28 November): done (`countdown-ring.tsx`; the class is `countdown`, since `ring` is the logo's). The time reaches CSS as `--countdown` from the same value as the timer; the browser check sees 8s, a ring that empties, is full with focus and starts over, and no CSP refusal. With the motion guard removed on purpose, reduced motion showed the ring 100% empty and the test caught it. The one refusal ignored is `eval`: Zod, which checks the chat's replies, tries it once in a try block when the chat opens (before the shelf exists) and does without. Full run on five projects: 1,127 passed, 348 skipped, none failed; the shelf tests 430 of 430 over 10 repeats; 1,031 web unit tests, lint and types pass.
  - Fixed on the way, and **also on `main`**: focus on Undo pauses its timer, and a button removed by its own click reports no blur, so the pause lasted and the next offer never went away (seen with Enter, and with a tap in Chrome on Android; commit `012d3ba`). The paused state now lives in the shelf. That commit builds on S2, so `main` needs the same fix made on its own code.
  - A test fault fixed: the chat gives focus back to its opener a moment after closing, and could take it from Undo just after a test had focused it (seen once in about 300 runs; 20 of 20 with that return delayed). The test now waits for it.

- [x] **S5. Grow and settle.** The pane grows from the bar when the shelf appears and settles back when time runs out, in about 350ms, with no movement under reduced motion. No animation library. If settling back needs the element kept after the offer ends, it must not be tappable, focusable or spoken during that time.
  - Test first: Undo cannot be used once the 8 seconds are over, even while the pane is still closing; a second clear during the close opens it again; with reduced motion it appears and goes at once; the bar gets its own glass back afterwards.
  - Done when: the tests pass without fixed sleeps and CLS is unchanged.
  - Result (local, 28 November): done. When the 8 seconds end the offer ends at once (the status area empties, the chat is forgotten), and a picture of the shelf, outside that area, `aria-hidden` and `inert`, closes for 350ms. `data-from` (`bar` or `alone`) is set once as a pane arrives. The words stay unseen while the pane is low enough to lie over the tabs.
  - **Found while checking CLS, and missed in S2 and S3:** changing the height of a pane fixed at the bottom moves its top edge, which Chrome counts as a layout shift. In the committed S2 shelf, one scroll away and back scored 0.0234, and three within the 8 seconds 0.0701, over our 0.05 budget (the S5 closing added 0.0079). Lighthouse never opens the chat, so it could not see this. Option A, chosen after a throwaway check: in layout the pane's top never moves; it changes height downwards and a `translate` keeps its bottom edge in place, both from one `@property` length, `--shelf-h`. A pseudo-element was tried first and was counted just the same. The check: 0.0000 against 0.0701 and 0.0079 in 3 of 3 runs, rest states identical to the old shelf, bottom edge within 0.02px in every frame in Chromium and WebKit.
  - Tests now count layout shifts while it settles and over three scrolls away and back (red before: 0.0079 and 0.061). Full run on five projects: 1,144 passed, 366 skipped, none failed; shelf and scrolling tests 980 of 980 over 10 repeats; 1,055 web unit tests, lint and types pass.

- [ ] **S6. Gates and fallbacks.** Full run on five projects, `make lint typecheck test`, Lighthouse, landing JS (4,012 bytes were left after step 12). Solid pane for reduced transparency, increased contrast and no `backdrop-filter`; system colours in forced colours, with a visible edge and Undo outline.
  - Test first: extend the fallback tests of step 6 to the shelf.
  - Done when: all pass and the figures are under "Measurements".

## Part 5: prove and finish

- [x] **12. Quality gates.** Full `make e2e`, axe in both schemes, Lighthouse with the bar showing. Compare with step 0: landing JS under 165 KB gzipped, CLS under 0.05, LCP no worse. About 5 KB of JS room was left on 22 November.
  - Result (local, 27 November, after the fix below): five projects in parallel, 1,084 passed, 306 skipped, none failed, in 4.0 minutes. Axe checks in light and dark are part of that run. **Desktop Firefox is not checked:** it does not launch on this Mac (`browserType.launch: Failed to launch`, seen today); CI at the final push is its first run. Lighthouse passed with the bar on screen (seen in its screenshots), figures below. `make lint typecheck test types-check` pass: 1,007 web and 671 API tests.
  - Fixed on the way: the WebKit failures seen since step 0 (parallel or one at a time; a one-at-a-time full run had 13). Tests opened browser contexts and did not close them; in the layout test, closing each took it from times rising past 12 s to a steady 0.5 s. `tests/e2e/fixtures.ts` closes them after every test. Not established: why the devotional page slowed far more than the landing page, and the one Chromium picker failure in step 9 (20 repeats passed) is not explained by this.
- [ ] **13. Real phones (Hendrik).** iPhone Safari (also as an installed PWA) and a mid-range Android phone:
  - [ ] Scrolling stays smooth with the blur on
  - [ ] No flicker when Safari's toolbar collapses
  - [ ] Safe area above the home indicator
  - [ ] Hold and slide, with no link preview
  - [ ] Leaving the chat: the shelf looks like one piece with the bar, "Chat cleared" is spoken by VoiceOver and TalkBack, Undo works, and the shelf stays usable while scrolling
  - [ ] VoiceOver and TalkBack reach and use the bar, including when hidden
  - [ ] Chat keyboard hides the bar and brings it back
  - [ ] Readable in sunlight, in both themes
  - [ ] iPad, if one is available: portrait shows the centred bar; check rotating with the chat open (a width of 1024px or more swaps to the desktop layout)
- [ ] **14. Docs.** Update CLAUDE.md (section 5, Bible reader and chat notes, layout), PLAN.md 1.10b, and mark landing_page_nav.md as replaced. Then open the PR with phone screenshots.

If step 13 shows poor scrolling, reduce the blur or use the solid bar. If screen readers cannot reach the hidden bar, stop and fix that before merging.

## Measurements

| When | Landing JS (gzipped) | LCP | CLS | TBT |
|---|---|---|---|---|
| Before (step 0) | 163,496 bytes (159.7 KiB; 5,464 bytes under the limit) | landing 1.67 s, devotional 1.66 s | 0.0002, 0.0001 | 47 ms, 51 ms |
| Before (step 0), CI | not printed by CI (the size check passed) | landing 1.76 s, devotional 1.72 s | 0.0004, 0.0009 | 95 ms, 98 ms |
| After (step 12), local | 164,948 bytes (161.1 KiB; 4,012 bytes under the limit; 1,452 more than step 0) | landing 1.63 s, devotional 1.62 s | 0.0002, 0.0001 | 20 ms, 19 ms |

Step 0, 27 November, local macOS, Bible and chat on. Lighthouse: median of 3 runs, performance 99, accessibility 100, best practices 96, SEO 100 on both pages. JS: measured by the `chat.spec.ts` size check in desktop Chromium. End to end: five local projects (not desktop Firefox), 986 passed, 184 skipped, 10 WebKit tests failed in the parallel run and passed when rerun one at a time. CI is the check for all six.

CI on `86f88bd` (PR 182): every check passed, including end to end on all six projects. CI Lighthouse: median of 3 runs, performance 98 on both pages. Compare CI figures with CI figures and local with local.
