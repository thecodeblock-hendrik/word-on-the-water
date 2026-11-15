# chat_checks.md - build checklist for the Got Questions chat

Work from this file, top to bottom, like [PWA_checklist.md](PWA_checklist.md). It turns [chat.md](chat.md) (scope, decisions, mockups in [design/chat_mockups.html](design/chat_mockups.html)) and [ADR 0009](adr/0009-chat-local-knowledge-base.md) into steps. PLAN.md step 1.10 holds the one-line status of each step; tick the matching box there when a step here is done.

## Rules for every step

- **One branch and one PR per step**, branch names 36 characters or fewer (suggested names are given). Conventional Commits, one commit per logical chunk, stage named files only (never `git add -A`), push once per step, merge with `gh pr merge --squash --admin` only when every check is green.
- **Tests first.** Write the test, run it, see it fail for the right reason (not an import or typo error), then write the code. Show the red run in the PR description.
- **Definition of done** (from PLAN.md): new behaviour has tests that failed first; `make lint typecheck test` pass (and `make e2e` for UI steps); negative and security cases are covered; anything touching Redis is tested against the real local service; tests are deterministic; the result is checked in the running system (curl, browser at 375px).
- **Never** log or store a visitor's message. No emojis in code or logs. Python only through `uv`. Read `node_modules/next/dist/docs/` before Next.js work.
- **Vercel Hobby build quota:** every non-docs push builds web and API. Push once per step, avoid experiment pushes. Docs-only branches use the `docs/` prefix and do not deploy.
- **Order:** K0 to K8 in order. K1 to K5 are API only; K6 and K7 are web. The chat stays off in Production (`CHAT_ENABLED` unset) until Part L of [production_checklist.md](production_checklist.md) is complete.
- Fallback everywhere the chat cannot be used (flag off, no JavaScript, API down): a mail link to `hello@wordonthewater.net`. There is no contact form at launch (1.5 is deferred).

## Before you start (once)

- [ ] `docs/chat-scope` is merged (the scope, mockups, ADR 0009 and this file are on `main`).
- [ ] Files in `~/Downloads`: `Christian_Faith_Knowledge_Base.md` (source), `build_kb.py`, `faith_kb (1).json` (expected output). Confirm they are unchanged since 2026-11-14 (the JSON rebuilt from the markdown was identical).
- [ ] Local stack up: `make up`, `make migrate`; the API tests pass on a clean checkout (`make test`).

---

## K0. Knowledge base into the repo (`feat/chat-k0-kb`)

Goal: the markdown source, the build script and the generated JSON live in the repo, and CI fails if they drift.

- [x] Create `apps/api/kb/` with `faith_kb.md` (the markdown source, renamed from `Christian_Faith_Knowledge_Base.md`) and `build_kb.py`.
- [x] `build_kb.py`: fix the docstring (`uv run`, not `python3`); take the output path as an argument; make the output reproducible (no timestamp in a field that `kb-check` compares: either drop `meta.generated` or ignore it in the check); keep `scikit-learn` out of the API's runtime dependencies (it is a dev dependency, and `kb/**` is excluded from the function bundle in `vercel.json`).
- [x] Generate `apps/api/app/data/faith_kb.json` (the committed output the API loads).
- [x] Test first: `tests/test_kb_build.py` rebuilds from the markdown into a temp file and compares with the committed JSON (ignoring `meta.generated`). It must fail before the JSON exists.
- [x] Makefile: `make kb` (rebuild the committed JSON) and `make kb-check` (rebuild into a temp file, fail on any difference). Add `kb-check` to CI next to `types-check`.
- [x] Validate: `make kb` leaves `git status` clean; editing one word in the markdown makes `make kb-check` fail; reverting makes it pass.
- [x] Docs: PLAN.md 1.10 K0 ticked; the bundle includes the JSON (check `apps/api/vercel.json` does not exclude `app/data`).

## K1. Load and validate (`feat/chat-k1-kb-load`)

Goal: the API loads the JSON once, validated, and fails safely.

- [x] Tests first (`tests/test_kb.py`):
  - [x] Every `related` id, glossary `entries` id and entry `glossary_terms` name resolves; ids are unique. Glossary `see_also` is not checked: its only value is the non-id text `Introduction`.
  - [x] `meta.counts` equals the real counts (203 entries, 16 contested, 39 glossary terms, 14 themes).
  - [x] Every entry has a non-empty `short_answer` and `explanation`; contested entries have `answer_guidance`.
  - [x] No field of any entry contains an HTML tag or `javascript:`.
  - [x] A corrupt fixture (missing field, unknown id, wrong type) raises a clear error.
- [x] `app/schemas/kb.py` or `app/services/kb_models.py`: Pydantic v2 models (`extra="forbid"`) for meta, theme, entry, glossary term, responses.
- [x] `app/services/kb.py`: `load_kb()` reads `app/data/faith_kb.json` once (module-level cache), validates, exposes `entries_by_id`, `themes`, `glossary`, `responses`, `version`. No network, no database.
- [x] Failure behaviour: if validation fails, the app still starts (health stays up), the chat reports unavailable, and the error is logged with the class only. Test it.
- [x] Validate: measure import and load time and memory (`uv run python -X importtime ...` or a simple timer); record the numbers in the PR. Target: load well under 200 ms. Measured 2026-11-15: load 4 to 11 ms, peak 1.6 MB; the 150 ms import is pydantic and structlog, shared with the app.
- [x] `make lint typecheck test` green; mypy strict.

## K2. Retrieval (`feat/chat-k2-search`)

Goal: a question returns the right entry, a confidence band, or nothing. Strict TDD against an evaluation set.

- [x] Evaluation set first (`tests/chat_eval/`):
  - [x] `own_questions.py` builds cases from the KB itself: every `question` and `also_asked` (532 cases) must retrieve its entry; require at least 95% first and 99% in the top three.
  - [x] `real_world.py` (plain Python, so no YAML dependency) about 48 hand-written wordings people would really type (typos, short forms, "is baptism needed", "who is jesus", "why did jesus die"). Each lists acceptable entry ids.
  - [x] `off_topic.py` 31 off-topic questions (weather, bread, football, code, tax) that must end in no answer. Include the two prototype failures: "what is the weather today" and "how do I bake bread".
  - [x] Run it once against a stub that returns nothing: it must fail.
- [x] `app/services/kb_search.py`:
  - [x] Tokeniser: lowercase, Unicode normalise (curly quotes), light stemming, small stop-word list that keeps question words that carry meaning.
  - [x] Index built once at load: per entry, weighted terms from `question` and `also_asked` (3), `tags` (2), `short_answer` (1), `explanation` (0.5); glossary terms and aliases map to their entries. BM25 style scoring, no external library.
  - [x] Near-exact bonus: a strong score when the whole normalised question matches `question` or an `also_asked` (token-set match), so "who is jesus" works although "jesus" is in most entries.
  - [x] Coverage rule: share of the question's meaningful words found in the best entry. Off-topic queries match one stray word, so low coverage must cap the band.
  - [x] `search(query, context) -> Result(entry_id, score, coverage, band, alternatives)` with bands `high`, `medium` (top three as "did you mean"), `low` (no answer).
- [x] Tune the thresholds on the evaluation set, not by feel. Write the chosen values and the reasoning in a docstring and in the PR. Record the final first-hit and top-three rates. Recorded 2026-11-15: own questions 99.4% first and 100% top three; real world 44/48 first and 47/48 top three; all 31 off-topic questions reach no answer; every own question is band high. Known limit: matching is by words, so a wording with no shared word ("is the bible true") needs the paraphrase added to the entry's Also asked line in the markdown.
- [x] Performance test: a search over the whole index completes in a few milliseconds (assert a generous bound, no flaky timing).
- [x] Validate: a small script prints the top three for ten sample questions.

## K3. Guards (`feat/chat-k3-guards`)

Goal: unsafe or unusable input never reaches search. Pure functions, table-driven tests.

- [ ] `app/services/chat_guards.py`; every function takes text and returns a typed result, never raises on odd input.
- [ ] Input normalisation: NFKC, strip control and zero-width characters, collapse whitespace, trim; reject empty and over 300 characters. Tests including emoji, right-to-left text, very long input.
- [ ] Personal-details check (tests first, positive and negative tables):
  - [ ] Email addresses, URLs, phone numbers (+27 and 0xx formats, spaced and dashed), long digit runs, card numbers (Luhn), South African 13-digit ID numbers, street-address patterns, "my name is", "I live at", "my number is".
  - [ ] Negatives that must pass: Bible references ("John 3:16", "Psalm 119:105"), years, "10 commandments", "Genesis 1:1-3", "1 Corinthians 15:3-4".
  - [ ] Patterns bounded (no nested quantifiers); a test runs a hostile 300-character string and asserts it finishes fast.
  - [ ] Result carries a reason code only, never the matched text.
- [ ] Crisis check (runs before everything else except normalisation):
  - [ ] A reviewed list of phrases and patterns (suicide, self-harm, "end my life", "don't want to be here anymore", abuse, "being hurt", "in danger").
  - [ ] Negatives that must not trigger: "I am dying to know", "kill time".
  - [ ] **Decided 2026-11-14:** any question that mentions suicide or self-harm, including theology questions such as "is suicide a sin", gets the crisis reply, not the knowledge base entry (10.13). Test it with several phrasings. The crisis reply may add a pointer to entry 10.13 afterwards (decide in K4).
  - [ ] Returns the KB `responses.crisis` text plus the "outside South Africa" line; the text is not generated.
- [ ] Prompt-injection style input (for example "ignore previous instructions") is harmless here (no model); a test documents that it is treated as an ordinary low-confidence question.
- [ ] Validate: a fuzz test with 1000 random strings never raises and always returns within a bound.

## K4. Conversation logic (`feat/chat-k4-followups`)

Goal: follow-ups understood from the last answer. Stateless: the request carries the context.

- [ ] `app/services/chat.py`: `reply(message_or_action, context) -> Reply`, a pure function over the KB.
- [ ] Context model: `last_entry_id` (optional) and `seen_entry_ids` (at most 20), validated against the KB; unknown ids rejected.
- [ ] Order of work inside `reply`: normalise, crisis, personal details, small talk, actions (entry, more, related, term), follow-up detection, search, band, build the reply.
- [ ] Small talk (fixed replies): hello, thanks, ok, bye. No search.
- [ ] Actions from buttons (no free text): `entry_id` returns that entry; `more` returns the last entry's explanation; `related` entry ids; `term` returns the glossary meaning. Tests that an unknown id or term is rejected.
- [ ] Short free-text follow-ups ("tell me more", "why", "what about baptism?", "explain simply"):
  - [ ] Detection: three or fewer meaningful words, or a reference word (it, that, this, he, him, they, more, why).
  - [ ] Boost toward the last entry, its `related` ids and its theme; down-rank entries in `seen_entry_ids`.
  - [ ] "More / explain / elaborate" returns the last entry's explanation if not yet shown, otherwise offers related questions.
- [ ] Reply shape: `answer` (entry with short answer, explanation, verses, related questions with text, glossary terms with meaning, contested flag and the `contested_suffix`), `clarify` (up to three options), `no_answer` (KB text), `crisis`, `smalltalk`, `rejected` (reason code).
- [ ] Contested rule: every contested entry reply carries the contested note. A test loops over all 16.
- [ ] 20 follow-up sequences as tests (for example gospel then "tell me more" then "why did he die"; baptism then "what about babies"; grace then "can I lose it"). Each asserts the entry ids at every turn.
- [ ] Validate: a small CLI or test helper plays a conversation and prints the replies; read three of them as a person would.

## K5. Endpoint (`feat/chat-k5-endpoint`)

Goal: `POST /v1/chat/messages`, safe and rate limited, following the new-endpoint checklist in CLAUDE.md section 14.

- [ ] Tests first (`tests/integration/test_chat.py`, real Redis):
  - [ ] Happy path for each reply kind; unknown fields rejected (`extra="forbid"`); either `message` or an action is required, not both.
  - [ ] No service token gives 401 (and the existing test that every `/v1` path rejects missing credentials still passes).
  - [ ] Rate limit: 30 messages per 10 minutes per hashed visitor address, the 31st gets a generic 429 with `Retry-After`; two visitors have separate allowances; limit keys are hashed.
  - [ ] Honeypot filled or form sent faster than `CHAT_MIN_SECONDS` gets a normal-looking reply and does no work (log reason only).
  - [ ] Over-long body gets the existing 413/400 behaviour; wrong content type is refused.
  - [ ] `CHAT_ENABLED` unset gives 503 `chat_unavailable`.
  - [ ] **No-leak test:** send a message containing a unique marker and a fake phone number; assert the marker never appears in captured logs, the error responses or the Sentry `before_send` output.
- [ ] `app/schemas/chat.py` (request and reply models), `app/routers/chat.py` (HTTP only), registered under the default-deny `/v1` router.
- [ ] Settings: `CHAT_ENABLED` (bool, default off), `CHAT_MIN_SECONDS`, rate limit values; blank values count as unset; list them in `.env.example` and `make setup` leaves them off.
- [ ] Logging: one line per request with outcome kind, matched entry id, band and latency only.
- [ ] `make types`: regenerate `packages/api-types`; `make types-check` passes.
- [ ] Validate: `curl` the endpoint with the service token for an answer, a follow-up, a rejected message and a crisis phrase; check headers (`Cache-Control: no-store`).
- [ ] Threat model rows C1, C2, C5, C7 and C8 moved from Planned to Done in the PR that makes them true.

## K6. Web panel (`feat/chat-k6-panel`)

Goal: the UI from [design/chat_mockups.html](design/chat_mockups.html), mobile first at 375px, behind `CHAT_ENABLED`.

- [ ] Read `node_modules/next/dist/docs/` for Server Actions and dynamic imports in this Next version.
- [ ] `src/lib/env.ts`: `CHAT_ENABLED` validated server side only (never `NEXT_PUBLIC_`).
- [ ] Tests first (Vitest and Testing Library):
  - [ ] Opening, closing (button, Escape, backdrop), focus moves into the dialog and returns to the Got Questions button.
  - [ ] Send with Enter, new line with Shift+Enter, send button disabled when empty.
  - [ ] Starter questions and chips send ids, not text.
  - [ ] Thread renders each reply kind (answer, clarify, no answer, rejected, crisis); crisis numbers are `tel:` links.
  - [ ] `sessionStorage`: thread restored after remount; Clear chat empties both state and storage; storage failure (private mode) does not break the chat (wrapped in try/catch).
  - [ ] New answers are in an `aria-live="polite"` region; focus stays in the input.
  - [ ] Text is rendered as text (a reply containing `<script>` appears literally).
- [ ] `src/lib/chat.ts` (Zod schema for replies and context, thread reducer, context builder: `last_entry_id` and `seen_entry_ids` capped at 20, thread capped at 30 messages).
- [ ] `src/lib/actions/chat.ts`: Server Action calling the API with the service token and the visitor's IP (reuse `api-client.ts` and `clientIpFrom`), `rendered_at`, the honeypot field. Map API errors to friendly messages (429, 503).
- [ ] Components in `src/components/chat/`: `chat-panel` (Radix Dialog; drawer from `lg`, full-height sheet below), `message-list`, `answer-card` (short answer, Read more, verses, related chips, terms), `chip`, `topic-browser` (the 14 themes then their questions; needs the theme and question list: ship a small generated `topics.json` from the KB or fetch it from the API), `chat-input` (visible privacy line above the input, inline rejected message).
- [ ] Verse chips: parse `key_verses` ("John 3:16", "Romans 3:23–24", "Acts 16:15, 31–34", "1 Corinthians 15:1–4") with the existing `lib/bible` helpers; link to `/bible/web/...` only when `BIBLE_ENABLED` is on and the reference parses; otherwise plain text. Test the odd formats.
- [ ] Entry point: `landing.ts` and `components/sections/start.tsx`: when `CHAT_ENABLED` the ghost button is "Got Questions" and opens the panel (loaded with a dynamic import on first click so the landing JS budget stays under 100 KB); otherwise, and without JavaScript, it stays a mail link to `hello@wordonthewater.net`. Test both.
- [ ] Styling with the existing tokens only (Dawn patrol and Night swell), 44px targets, safe-area insets (`env(safe-area-inset-*)`, `100dvh`), `prefers-reduced-motion`.
- [ ] CSP: no change expected (no third-party calls); confirm no inline styles or scripts are added (the nonce CSP blocks them).
- [ ] Validate: `pnpm dev` with `CHAT_ENABLED=1` and the API running; screenshot at 375, 768 and 1280, light and dark, against the mockups; run through the Part L preview checks informally.

## K7. End to end and quality (`feat/chat-k7-e2e`)

- [ ] Stub API for e2e (`tests/e2e/stub-api.mts`): extend with chat replies keyed per request (no global "last request": e2e runs fully parallel).
- [ ] Playwright journeys on all six projects: open from Start here, starter question, follow-up chip, "tell me more", contested answer, rejected message, crisis reply, Clear chat, reload keeps the thread, new tab does not.
- [ ] Flag off: the button is a mail link and no chat code is requested (network check).
- [ ] `@axe-core/playwright`: zero serious or critical violations in both colour schemes, panel open, in answer and crisis states.
- [ ] Bundle check: landing page JS stays under 100 KB gzipped with the flag on and off; the chat chunk loads only after the click.
- [ ] No CSP violations in the console during the journeys.
- [ ] Real phone: iPhone Safari and Android Chrome. Keyboard opens without hiding the input, safe areas, tap targets, scrolling, dark mode. Note findings in the PR.
- [ ] Manual accessibility pass: keyboard only, VoiceOver iOS, TalkBack.

## K8. Docs and launch readiness (`feat/chat-k8-docs`)

- [ ] Threat model: rows C1 to C9 set to Done with the test that proves each.
- [ ] `privacy.md`: chat rows set from "planned" to current; short notice text for the page ("not stored, not shared").
- [ ] Runbook `docs/runbooks/chat.md`: how to update the knowledge base (edit the markdown, `make kb`, PR, bump version and review date), how to turn the chat off (unset `CHAT_ENABLED`), how to read the outcome counts, where the KB source lives.
- [ ] `CLAUDE.md`: planned items become built (layout, API table, frontend section, commands `make kb` and `make kb-check`); PLAN.md 1.10 ticks; ADR 0009 status stays accepted.
- [ ] Verify the crisis numbers on the providers' own sites (SADAG 0800 567 567, LifeLine 0861 322 322) and record the date.
- [ ] Walk through Part L of [production_checklist.md](production_checklist.md) on a preview with `CHAT_ENABLED=1`.
- [ ] **(Hendrik)** Set `CHAT_ENABLED=1` in Production, redeploy, check the button. Rollback: unset the variable and redeploy.

## After launch

- [ ] Review outcome counts weekly for the first month: share of `no_answer` and `clarify`; add or reword entries by pull request (`make kb`, `make kb-check`).
- [ ] Optional later (separate scope): thumbs up or down per answer storing only an entry id, ESV links once Crossway approves, type-ahead suggestions, an LLM that only rephrases retrieved entries (needs its own ADR first).
