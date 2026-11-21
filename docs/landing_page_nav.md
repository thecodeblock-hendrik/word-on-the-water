# Landing page bottom navigation

Mockups: [design/landing_nav.html](design/landing_nav.html) (New A raised tab, light and dark). Not implemented yet.

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
- Closing or exiting the chat (close button, Escape, scrim) clears the thread and the "came from the chat" flag, so the Bible shows Shore again and reopening the chat starts empty.
- Following a verse link from a chat answer to the Bible keeps the thread and the Your chat button.

## Steps

One branch and PR (for example `feat/bottom-nav`), tests first, one commit per step.

- [ ] 1. Confirm the mockups (every scenario in `landing_nav.html`) and the open question below.
- [ ] 2. Content: add the labels (Devotional, Bible, Got Questions) to the typed content files.
- [ ] 3. Current devotional link: a helper that returns the latest published devotional URL (unit test, with `DEVOTIONAL_TODAY`).
- [ ] 4. `BottomNav` component: the raised-tab bar (SVG curve, 56px round button, two bordered side buttons, 44px targets, safe-area inset, fixed height). Unit tests.
- [ ] 5. Current page state: Devotional is accent coloured on the devotional page (`aria-current="page"`).
- [ ] 6. Mount the bar on the landing page, the devotional page, privacy, thank you and not found; hide it from `lg` up. Add bottom padding so it never covers content or the footer.
- [ ] 7a. Chat screen on phones: floating input pill, bar below it, bar hidden while the keyboard is open (test with the visual viewport), thread scrolls above the pill.
- [ ] 7. Got Questions opens the chat through `openChat` (no navigation); existing launchers keep working.
- [ ] 8. Clear on close: closing the chat calls `clearThread` and `clearChatReturn`. Following a verse link must not clear. Unit tests for both.
- [ ] 9. Check scenario G: close the chat, open the Bible, no chat button; reopen the chat, empty starter.
- [ ] 10. Bible reader: add the Shore (surfboard) middle button to the raised chapter bar, reuse the Your chat slot (Shore unless the visitor came from the chat). Tests for both states.
- [ ] 11. Accessibility: labelled nav landmark, visible labels, focus order and ring, axe on every page that has the bar.
- [ ] 12. E2E on iPhone SE, iPhone 13 and Pixel 7: each button goes where it should; chat to Bible to chat flow; close the chat then the Bible shows Shore.
- [ ] 13. Performance: landing JS stays under 165 KB gzipped, CLS under 0.05.
- [ ] 14. Light and dark check at 375px, then a real phone check (VoiceOver, TalkBack).
- [ ] 15. Docs: update CLAUDE.md (layout, Bible reader and chat sections) and PLAN.md.

## Open questions

None. Decided: Shore icon is the surfboard in the sand, the chat input is the floating pill (idea 2), and the chat screen buttons are option 1.
