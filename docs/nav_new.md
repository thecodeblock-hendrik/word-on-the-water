# Liquid glass bottom navigation: build plan

Design: [design/landing_nav_new.html](design/landing_nav_new.html). It replaces the raised-tab bar in [landing_page_nav.md](landing_page_nav.md). Build it after the 28 November launch.

**Decided:** light glass in Dawn patrol and dark glass in Night swell; plain chevrons for Previous and Next; no resting pill on any screen; on a devotional page the Devotional button becomes Shore and opens the landing page; the bar hides while scrolling down. Below `lg`, tablets use the same bar; the bar, chat message pill and Undo toast are at most 440px wide and centred (section 13 of the mockup).

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

- [ ] **11. Connect it.** A passive window scroll listener for the site and reader bars, not the chat bar. The state resets on every new page or chapter. The bar slides in 200ms (no slide with reduced motion). The toast stays and moves into the bar's place. The hidden bar is not `inert` or `aria-hidden`; keyboard focus (`:focus-visible`) shows it. Page padding does not change. Desktop never hides.
  - Test first: unit tests for the reset and the chat exception; e2e on the phone projects for hide, return, end of page, keyboard focus, the toast, the reader and reduced motion.
  - Done when: the e2e journeys pass without fixed sleeps and CLS is unchanged.

## Part 4: prove and finish

- [ ] **12. Quality gates.** Full `make e2e`, axe in both schemes, Lighthouse with the bar showing. Compare with step 0: landing JS under 165 KB gzipped, CLS under 0.05, LCP no worse. About 5 KB of JS room was left on 22 November.
- [ ] **13. Real phones (Hendrik).** iPhone Safari (also as an installed PWA) and a mid-range Android phone:
  - [ ] Scrolling stays smooth with the blur on
  - [ ] No flicker when Safari's toolbar collapses
  - [ ] Safe area above the home indicator
  - [ ] Hold and slide, with no link preview
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
| After (step 12) | | | | |

Step 0, 27 November, local macOS, Bible and chat on. Lighthouse: median of 3 runs, performance 99, accessibility 100, best practices 96, SEO 100 on both pages. JS: measured by the `chat.spec.ts` size check in desktop Chromium. End to end: five local projects (not desktop Firefox), 986 passed, 184 skipped, 10 WebKit tests failed in the parallel run and passed when rerun one at a time. CI is the check for all six.

CI on `86f88bd` (PR 182): every check passed, including end to end on all six projects. CI Lighthouse: median of 3 runs, performance 98 on both pages. Compare CI figures with CI figures and local with local.
