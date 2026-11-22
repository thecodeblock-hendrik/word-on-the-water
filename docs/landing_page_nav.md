# Landing page bottom navigation

Mockups: [design/landing_nav.html](design/landing_nav.html) (New A raised tab, light and dark; section G is the undo toast, option 3). Not implemented yet.

## Behaviour

| Page | Left | Middle | Right |
|---|---|---|---|
| Landing page | Devotional | Bible | Got Questions |
| Devotional page | Devotional (current) | Bible | Got Questions |
| Privacy, thank you, not found | Devotional | Bible | Got Questions |
| Chat screen | Devotional | Bible | Shore |
| Bible reader | Previous chapter | Shore (surfboard) | Next chapter |
| Bible reader, came from the chat | Previous chapter | Your chat | Next chapter |

- Chat screen (phones): the bar stays at the bottom under the chat. The message box is a floating pill with no strip or border behind it, 34px above the bar so the bar's curve rises into clear space (idea 2, section J of the mockup). While the keyboard is open the bar is hidden. The buttons are Devotional, Bible and Shore (option 1: Got Questions is not needed inside the chat). Tapping any of them leaves the chat and clears it; a verse link is the only exit that keeps it.
- Phones only (below `lg`). Desktop is unchanged.
- The Bible reader does not get the three-button bar. It keeps its pinned chapter bar in the same raised design (New A): Previous and Next chapter left and right, and in the middle a surfboard-in-the-sand button labelled Shore that goes to the landing page. For a visitor who came from the chat the middle button is Your chat (the existing one) instead.
- Devotional goes to the current devotional (`latestPublished`). Bible goes to `/bible` (resumes the remembered passage). Got Questions opens the chat in place.
- Closing or exiting the chat (close button, Escape, scrim, or any bar button) clears the thread, the draft and the "came from the chat" flag at once, so the Bible shows Shore again and reopening the chat starts empty. There is no confirmation question (decided, option 3 in section G of the mockup).
- Undo toast: if the chat had an answer or a draft, a toast "Chat cleared" with an Undo button shows for 8 seconds above the bar. Undo restores the thread and the draft and reopens the chat over the current page. An empty chat leaves silently, with no toast.
  - The cleared thread is held in a module-level variable for those 8 seconds only, never in `sessionStorage`, and dropped when the timer ends or when a new chat is opened the normal way. It is not dropped on navigation, because the toast has to show on the page the bar button leads to.
  - The toast has `role="status"`, pauses its timer while Undo has focus (WCAG 2.2.1), keeps a 44px target, sits above the bar so it never covers the raised middle button, and fades with no slide under `prefers-reduced-motion`.
- Following a verse link from a chat answer to the Bible keeps the thread and the Your chat button.

## Steps

One branch and PR (for example `feat/bottom-nav`), tests first, one commit per step.

- [x] 1. Confirm the mockups (every scenario in `landing_nav.html`) and the open question below.
- [x] 2. Content: add the labels (Devotional, Bible, Got Questions) to the typed content files.
- [x] 3. Current devotional link: a helper that returns the latest published devotional URL (unit test, with `DEVOTIONAL_TODAY`).
- [x] 4. `BottomNav` component: the raised-tab bar (SVG curve, 56px round button, two bordered side buttons, 44px targets, safe-area inset, fixed height). Unit tests.
- [x] 5. Current page state: Devotional is accent coloured on the devotional page (`aria-current="page"`).
- [x] 6. Mount the bar on the landing page, the devotional page, privacy, thank you and not found; hide it from `lg` up. Add bottom padding so it never covers content or the footer.
- [x] 7a. Chat screen on phones: floating input pill, bar below it, bar hidden while the keyboard is open (test with the visual viewport), thread scrolls above the pill.
- [x] 7. Got Questions opens the chat through `openChat` (no navigation); existing launchers keep working.
- [x] 8. Clear on close: closing the chat calls `clearThread` and `clearChatReturn`, and keeps the cleared thread and draft in memory for the undo. Following a verse link must not clear. Unit tests for both.
- [x] 8a. `UndoToast` component: 8 second timer that pauses on focus, `role="status"`, Undo restores thread and draft and reopens the chat, nothing shown for an empty chat, memory dropped on timeout and when a new chat is opened. Unit tests for each, including Undo from the Bible reader and from the devotional page.
- [x] 9. Check scenario G: close the chat, open the Bible, no chat button; reopen the chat, empty starter. (Checked in a browser at 375px on 2026-11-22; the Shore button in the Bible is step 10, and step 12 automates this flow.)
- [x] 10. Bible reader: add the Shore (surfboard) middle button to the raised chapter bar, reuse the Your chat slot (Shore unless the visitor came from the chat). Tests for both states.
- [x] 11. Accessibility: labelled nav landmark, visible labels, focus order and ring, toast announced and not covering the bar, axe on every page that has the bar.
- [x] 12. E2E on iPhone SE, iPhone 13 and Pixel 7: each button goes where it should; chat to Bible to chat flow; close the chat then the Bible shows Shore; leave the chat, tap Undo, the thread and draft are back.
- [ ] 13. Performance: landing JS stays under 165 KB gzipped, CLS under 0.05.
- [ ] 14. Light and dark check at 375px, then a real phone check (VoiceOver, TalkBack).
- [ ] 15. Docs: update CLAUDE.md (layout, Bible reader and chat sections) and PLAN.md.

## Open questions

None. Decided: Shore icon is the surfboard in the sand, the chat input is the floating pill (idea 2), the chat screen buttons are option 1, the Devotional button links as in the table, the chat screen keeps the full bar (collapse it later only if testing shows a need), and leaving the chat clears it with an 8 second undo toast (no confirmation).
