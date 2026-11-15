# chat.md - "Got Questions" faith chat (scope, v2: local knowledge base)

Status: scope accepted, nothing built. Rewritten 2026-11-14 (v1 used OpenRouter and web search; replaced, see section 2).
Recorded in: [ADR 0009](adr/0009-chat-local-knowledge-base.md), [PLAN.md](PLAN.md) step 1.10, `CLAUDE.md` (sections 1, 4, 6.1, 8, 9, 13 and decisions), [threat-model.md](threat-model.md) (C1 to C9), [privacy.md](privacy.md), [production_checklist.md](production_checklist.md) Part L, `README.md` and `.env.example` (`CHAT_ENABLED`). Build checklist: [chat_checks.md](chat_checks.md). Mockups: [design/chat_mockups.html](design/chat_mockups.html).

Files this scope is based on (currently in `~/Downloads`, to be moved into the repo in step K0):
- `build_kb.py` - converts the knowledge-base markdown export into JSON.
- `faith_kb (1).json` - the newer export (21:24). `faith_kb.json` (21:17) is older; the two differ only in the explanation text of entries 9.11 and 10.13 (the newer one adds the South African crisis numbers). **This scope uses `faith_kb (1).json`.**

---

## 1. What changes

In the "New to faith? Start here" section the ghost button **Talk to someone** (`apps/web/src/content/landing.ts:98`, rendered in `components/sections/start.tsx:49`, with the chat off it is now a `mailto:hello@wordonthewater.net` link, because the page has no contact section) becomes **Got Questions**. It opens a chat panel. The visitor types a question about the Christian faith and gets an answer from our own knowledge base (KB). Follow-up questions work: the chat remembers what was just discussed.

The prayer and contact forms are not part of the launch (decided 2026-11-14), so "contact" in this scope means the `hello@wordonthewater.net` mail link. The route to a real person is kept inside the chat: the no-answer, crisis and "views differ" replies all point to a local pastor.

## 2. Why a local knowledge base (decision, replaces the OpenRouter design)

| Risk in v1 (LLM + web search) | With the local KB |
|---|---|
| Free endpoint logs prompts and uses them to improve the provider's products; faith questions are special category data (GDPR, POPIA) | Questions never leave our own API |
| Model can hallucinate or leave the approved sources; needs layered guards | Every answer is a stored, reviewable KB entry: nothing is generated |
| Prompt injection from the visitor and from retrieved web pages | No model and no web content, so no prompt to inject into |
| Per-message cost, provider rate limits and outages | Pure CPU on our API, no third party in the request path |
| Hard to test | Deterministic: same question, same answer, testable in CI |

The cost: the chat can only answer what the KB contains (203 questions) and understands wording through keyword matching, not meaning. Section 12 keeps an optional, later LLM layer on the table; it is **not** in this scope.

## 3. The knowledge base (what we have)

`faith_kb (1).json`, 328 KB, version `0.1-draft`.

| Part | Content |
|---|---|
| `meta` | title, version, counts (203 entries, 16 contested, 39 glossary terms, 14 themes), doctrinal basis, **status: "Maintained by Word on the Water."** |
| `themes` | 14 topics: God, Jesus Christ, The Gospel and Salvation, The Bible, The Holy Spirit, Creation and Humanity, Prayer and Spiritual Growth, The Church, Suffering and Evil, Death and the Afterlife, Angels/Satan/Spiritual Warfare, End Times, Common Objections, Christian Living |
| `responses` | fixed texts: `no_answer`, `contested_suffix`, `crisis` (SADAG 0800 567 567 and LifeLine 0861 322 322) |
| `entries[]` | `id` (e.g. `3.1`), `theme`, `question`, `also_asked[]` (paraphrases), `short_answer`, `explanation`, `contested` (bool), `key_verses[]` (references only, no quotes), `tags[]`, `related[]` (up to 5 ids, computed by `build_kb.py`), `glossary_terms[]`, `search_text`, `answer_guidance` (contested entries only) |
| `glossary[]` | `term`, `aliases[]`, `meaning`, `key_verses[]`, `entries[]`, `see_also[]` |

Checked: every `related` and glossary entry id exists; every entry has both a short answer and an explanation; an answer averages 474 characters (longest 775), so answers fit on a phone screen without scrolling.

Points to settle before launch (also in section 13):
1. **No pastoral review gate (decided 2026-11-15).** The file used to say "Draft for pastoral review"; that status text is replaced. The no-answer, crisis and contested replies still point to a local pastor.
2. **Content origin.** Confirmed original text (we own it). The doctrinal basis only names GotQuestions.org and Bible.org as the beliefs it agrees with.
3. **Crisis numbers are South African** (the audience is mainly South Africa, decided). Verify both numbers on the providers' own sites before launch; the reply adds a line telling visitors elsewhere to call their local emergency number.
4. **The markdown source is still to come.** Hendrik will provide it. `build_kb.py` reads it and generates the JSON; the markdown is the editable source of truth and is committed with the script.
5. **`build_kb.py` needs `scikit-learn`** (for the "related" ranking) and its docstring says `python3`. In this project it runs as a dev tool through `uv` (`uv run --with scikit-learn ...` or a dev dependency group), never shipped to the function bundle.

## 4. How a question is answered

```
question (<= 300 chars)
  -> normalise (Unicode, lowercase, strip control characters)
  -> 1 crisis check            hit  -> KB responses.crisis, stop
  -> 2 personal-details check  hit  -> "can't take personal details", stop, nothing kept
  -> 3 small talk / follow-up intents (thanks, hello, "tell me more", "why?")
  -> 4 retrieve: score every entry, boosted by conversation context
  -> 5 confidence band
        high   -> answer card for the entry
        medium -> "Did you mean...?" with the top 3 questions as buttons
        low    -> responses.no_answer (+ pastor and contact link)
```

Retrieval (in-process, no database, no embeddings service):
- Index built once when the API process starts (203 entries, tens of milliseconds): lowercased words with light stemming and stop words removed, from `question` and `also_asked` (weight 3), `tags` (2), `short_answer` (1), `explanation` (0.5), plus glossary terms and aliases mapped to their entries.
- Score = BM25-style keyword score + a strong bonus for a near-exact match of the whole question against `question` or `also_asked`.
- Confidence band thresholds are tuned on the evaluation set (below), not guessed.

**Evidence from a prototype (run against the real file, standard library only):** querying each entry's own question and paraphrases (532 queries) found the right entry first 96.2% of the time and within the top 3 99.6% of the time. Two honest caveats: this test is optimistic because those exact words are in the index; and plain keyword scoring has two weaknesses the real design must handle: (a) "what is the weather today" and "how do I bake bread" still scored 4.9 and 6.3 (they matched "today" and "bread"), so confidence must also require enough of the *question's* words to match, not just a high raw score; (b) "who is jesus" scored low because "jesus" appears in nearly every entry, which the near-exact question bonus fixes. Both are test cases in step K2.

**Evaluation set** (committed as a test): all 532 KB questions and paraphrases (must retrieve their entry, at least 95% first), about 40 hand-written real-world wordings, 20 off-topic questions (must reach `no_answer`), 10 crisis phrases, 15 personal-detail messages, and 20 follow-up sequences.

## 5. Follow-up questions and history

A follow-up is understood from what was just shown, not from keywords alone.

**Three ways to follow up**
1. **Buttons (most reliable).** Each answer ends with chips: *Read more* (shows the `explanation`), *You might also ask* (the entry's `related` questions) and *Terms* (its `glossary_terms`, showing the glossary meaning). A chip sends an entry id or a term, never free text, and the server validates it against the KB.
2. **Short free-text follow-ups.** "Why?", "what about baptism?", "tell me more", "can you explain that simply?" Rules: if the message is short (three or fewer meaningful words) or uses a reference word (it, that, this, he, him, they, more, why), the search is boosted toward the last entry, its `related` entries and its theme, and entries already shown are down-ranked so the same answer is not repeated. "More / explain / elaborate" shows the last entry's `explanation` if it was not shown yet, otherwise offers the related questions.
3. **Small talk.** "Thanks", "hello", "ok" get a short friendly fixed reply and no search.

**Where history lives (decision D1): in the browser, nothing stored on the server.**
- The chat thread is kept in the browser's `sessionStorage` (survives reloads of the tab, gone when the tab closes), as a list of `{role, text or entry id}`. A **Clear chat** button deletes it at once.
- Each request sends only the new message plus a small context: `last_entry_id`, up to 20 `seen_entry_ids` and up to 20 `explained_entry_ids` (so "tell me more" knows whether the explanation was already shown). The server checks that they are real KB ids and holds nothing between requests (no Redis conversation, no database). A visitor who forges an id can only change which genuine KB entry gets a ranking boost; there is no model to manipulate, so there is nothing to exploit.
- Why not keep history on the server: it would store what people ask about their faith for no benefit, and it would add retention rules, deletion and a notice. Browser-only history is private by construction and still gives follow-ups.
- Decided: `sessionStorage` only, so the thread is gone when the tab closes (safer on shared phones and computers). No `localStorage`.
- History is capped at 30 messages in the browser; the server context is capped at 20 ids.

## 6. User experience

### 6.1 Principles
- One purpose: ask a question, get a clear answer, keep going.
- A blank box intimidates a newcomer, so the empty state offers starter questions and **Browse by topic** (the 14 themes, each opening its questions).
- Honest labelling: "Answers come from our reviewed knowledge base. This is not a pastor." (never "AI", because it is not).
- Plain language; the KB is already written that way. Scripture shown as references that link to the Bible reader (WEB text) when `BIBLE_ENABLED` is on; plain text otherwise.
- Accessible: dialog with focus trap, Escape closes, new answers announced through `aria-live="polite"`, Enter sends, Shift+Enter adds a line, 44px targets, visible labels, contrast in both colour schemes, `prefers-reduced-motion` respected.
- Without JavaScript, or with `CHAT_ENABLED` off, the button is a mail link to `hello@wordonthewater.net`, so nobody loses the route to a person.

### 6.2 States
1. Closed: the **Got Questions** button in the Start here section.
2. Open, empty: intro, starter questions, Browse by topic, input.
3. Answer: short answer, Read more, key scriptures, related questions, terms.
4. Contested answer: the same, with a "Christians differ on this" note (`contested_suffix`) and no side taken.
5. Did you mean: three question buttons when confidence is medium.
6. No answer: `responses.no_answer` plus a Mail link.
7. Rejected input: personal details, over length, or empty. Inline message, nothing sent or kept.
8. Crisis: `responses.crisis`, tappable `tel:` links, no other content.
9. Error or busy: friendly retry message (rate limit or API down).

Visual mockups (light and dark, desktop and mobile, all states): open [design/chat_mockups.html](design/chat_mockups.html) in a browser. The ASCII sketches below are the quick reference.

### 6.3 Mockups - desktop (from `lg`, 1024px and up)

A right-hand drawer (440px) over a dimmed page. It does not cover the Start here section on small laptops and is a standard accessible dialog.

Entry point:

```
+----------------------------------------------------------------+
|  NEW TO FAITH?                                                 |
|  Start here                                                    |
|                                                                |
|  1  ...   2  ...   3  ...   4  ...                             |
|                                                                |
|  [ Get the devotional ]   [ Got Questions ]  <- ghost button   |
+----------------------------------------------------------------+
```

Open, empty state:

```
+---------------------------------------------+------------------+
|  (page, dimmed)                             | Got Questions  X |
|                                             |------------------|
|                                             | Ask about the    |
|                                             | Christian faith. |
|                                             | Answers come     |
|                                             | from our         |
|                                             | reviewed         |
|                                             | knowledge base.  |
|                                             |                  |
|                                             | [Who is Jesus?]  |
|                                             | [What is the     |
|                                             |  gospel?]        |
|                                             | [Does God exist?]|
|                                             |                  |
|                                             | Browse by topic  |
|                                             | God > Jesus >    |
|                                             | Salvation > ...  |
|                                             |------------------|
|                                             | Please don't     |
|                                             | share personal   |
|                                             | details.         |
|                                             | +--------------+ |
|                                             | |Type your     | |
|                                             | |question...   | |
|                                             | +----------[>]-+ |
+---------------------------------------------+------------------+
```

Answer with follow-up (Clear chat at the top, history scrolls):

```
+---------------------------------------------+------------------+
|  (page, dimmed)                             | Got Questions  X |
|                                             | [Clear chat]     |
|                                             |------------------|
|                                             |     +-----------+|
|                                             |     |What is    ||
|                                             |     |grace?     ||
|                                             |     +-----------+|
|                                             | +--------------+ |
|                                             | |Grace is God's| |
|                                             | |free, undeser-| |
|                                             | |ved favour... | |
|                                             | |[Read more v] | |
|                                             | |              | |
|                                             | |Key scriptures| |
|                                             | |(Eph 2:8-9)   | |
|                                             | |(Rom 3:23-24) | |
|                                             | |              | |
|                                             | |You might ask | |
|                                             | |[Can I lose   | |
|                                             | | my salvation?]| |
|                                             | |[What is faith| |
|                                             | | ?]           | |
|                                             | |Terms: [Grace]| |
|                                             | +--------------+ |
|                                             |     +-----------+|
|                                             |     |tell me    ||
|                                             |     |more       ||
|                                             |     +-----------+|
|                                             | (explanation     |
|                                             |  shown)          |
|                                             |------------------|
|                                             | [Type...      >] |
+---------------------------------------------+------------------+
```

Contested answer, did-you-mean, and rejected input:

```
 Contested                    Did you mean                 Rejected input
+--------------------+       +--------------------+       +------------------------+
| Baptism: short     |       | I'm not sure what  |       | my number is 082 555.. |
| answer...          |       | you mean. Did you  |       | ! This chat can't take |
| (i) Christians who |       | mean:              |       |   personal details.    |
| hold to the Bible's|       | [Is baptism needed |       |   Please ask about the |
| authority disagree |       |  to be saved?]     |       |   Christian faith. To  |
| on this. Your local|       | [What is baptism?] |       |   reach a person, email|
| pastor can help    |       | [Who can be        |       |   hello@wordonthewater |
| you think it       |       |  baptised?]        |       +------------------------+
| through.           |       +--------------------+
+--------------------+
```

### 6.4 Mockups - mobile (375px, below `lg`)

A full-screen sheet from the bottom (the same pattern as the Bible passage sheet). The header is pinned; the input is pinned above the keyboard using `100dvh` and `env(safe-area-inset-bottom)`.

Empty state:

```
+-----------------------------+
| Got Questions            [X]|
|-----------------------------|
|  Ask about the Christian    |
|  faith. Answers come from   |
|  our reviewed knowledge     |
|  base.                      |
|                             |
|  +-----------------------+  |
|  | Who is Jesus?         |  |
|  +-----------------------+  |
|  +-----------------------+  |
|  | What is the gospel?   |  |
|  +-----------------------+  |
|  +-----------------------+  |
|  | Does God exist?       |  |
|  +-----------------------+  |
|                             |
|  Browse by topic         >  |
|-----------------------------|
| Please don't share personal |
| details.                    |
| +-----------------------+   |
| | Type your question... |[>]|
| +-----------------------+   |
+-----------------------------+
```

Conversation with follow-up:

```
+-----------------------------+
| Got Questions  [Clear]   [X]|
|-----------------------------|
|          +----------------+ |
|          | What is grace? | |
|          +----------------+ |
| +-------------------------+ |
| | Grace is God's free,    | |
| | undeserved favour...    | |
| | [Read more v]           | |
| |                         | |
| | Key scriptures          | |
| | (Eph 2:8-9) (Rom 3:23)  | |
| |                         | |
| | You might also ask      | |
| | [Can I lose my          | |
| |  salvation?]            | |
| | [What is faith?]        | |
| +-------------------------+ |
|       +-----------------+   |
|       | tell me more    |   |
|       +-----------------+   |
|-----------------------------|
| +-----------------------+   |
| | Type your question... |[>]|
| +-----------------------+   |
+-----------------------------+
```

Browse by topic, and crisis:

```
+-----------------------------+       +-----------------------------+
| < Topics                 [X]|       | Got Questions            [X]|
|-----------------------------|       |-----------------------------|
|  God                      > |       | +-------------------------+ |
|  Jesus Christ             > |       | | If you are in danger or | |
|  The Gospel and Salvation > |       | | thinking about harming  | |
|  The Bible                > |       | | yourself, please reach  | |
|  The Holy Spirit          > |       | | out right away.         | |
|  Creation and Humanity    > |       | |                         | |
|  Prayer and Growth        > |       | | SADAG (24h, free):      | |
|  The Church               > |       | | [0800 567 567]          | |
|  Suffering and Evil       > |       | | LifeLine (24h):         | |
|  ...                        |       | | [0861 322 322]          | |
+-----------------------------+       | | Emergency services if   | |
                                      | | your life is in danger. | |
                                      | | Outside South Africa,   | |
                                      | | call your local         | |
                                      | | emergency number.       | |
                                      | +-------------------------+ |
                                      +-----------------------------+
```

Design notes: assistant cards on `--surface` with a `--line` border, user bubbles in `--accent` with `--accent-ink`; headings in Barlow Condensed, body in Barlow; chips are 44px tall; answer text near 62ch on desktop; new messages scroll into view without taking focus from the input; the slide animation is removed under `prefers-reduced-motion`; axe checks in both colour schemes. Cards show the KB version in a small "About these answers" line (KB version, review date) once reviewed.

## 7. Architecture

Follows the BFF rule (ADR 0001): the browser never calls FastAPI directly. There is no third party in the path.

```
Browser (chat panel, client component, lazy loaded)
   | Server Action (origin checked)
   v
Next.js (apps/web)   Zod validation, adds service token + X-Client-IP
   v
FastAPI (apps/api)   POST /v1/chat/messages
   rate limit -> guards -> intents -> retrieval (in-memory KB index) -> reply
```

API
- `POST /v1/chat/messages`. Body (`extra="forbid"`): `{ message?: string (1-300), entry_id?: string, action?: "more"|"related"|"term", term?: string, context: { last_entry_id?: string, seen_entry_ids: string[] (<= 20) }, rendered_at, website }`. Either `message` or `entry_id` is required.
- 200 reply: `{ kind: "answer"|"clarify"|"no_answer"|"crisis"|"smalltalk"|"rejected", entry?: {id, question, short_answer, explanation, contested, key_verses[], related[{id,question}], glossary_terms[{term,meaning}]}, options?: [{id,question}], text?: string, kb_version }`. Text for fixed replies comes from the KB `responses`.
- Errors: a rejected message is a normal 200 reply with `kind: "rejected"` and a reason code (K5), 422 for a malformed body, 429 `rate_limited`, 503 `chat_unavailable`; same error shape as the rest of the API.
- Module layout (layering rule: routers -> services): `routers/chat.py`, `services/kb.py` (load, validate, index), `services/chat.py` (orchestration and follow-up logic), `services/chat_guards.py`, `schemas/chat.py`, `data/faith_kb.json`.
- The KB is loaded once per process (module-level cache), validated by Pydantic models on load; if validation fails the app fails fast at start-up and the endpoint reports `chat_unavailable`. Cold start impact is measured in K1 (330 KB parse plus index).
- Web: `components/chat/` (`chat-panel`, `message-list`, `answer-card`, `chip`, `topic-browser`, `chat-input`), `lib/actions/chat.ts`, `lib/chat.ts` (Zod and thread state). Radix Dialog, loaded with a dynamic import on first click so the landing page JS budget (< 100 KB) is untouched.
- Settings: `CHAT_ENABLED` (default off; the button falls back to the contact link). No secrets are needed.
- Data: nothing in Postgres or Redis except the existing rate-limit counters.

KB build and update flow
- `apps/api/kb/faith_kb.md` (editable source, reviewed by the pastor) -> `build_kb.py` (dev tool, `uv run`) -> `apps/api/app/data/faith_kb.json` (committed). CI rebuilds and fails if the committed JSON is stale (same idea as `make types-check`: `make kb-check`). Changing an answer is a pull request; the KB `version` and review date are bumped each time.

## 8. Security and best practice

Mapped to OWASP ASVS L2 and the Top 10; the design removes most LLM-specific risks because there is no LLM.

Input
- Strict schema (`extra="forbid"`, length 1 to 300, ids matched against the KB), Unicode normalised, control characters stripped, body size limit already enforced globally.
- **No personal details (requirement).** Deterministic checks before anything else is done with the text: email addresses, phone numbers (including +27 and 0xx forms), long digit runs, card numbers (Luhn), South African 13-digit ID numbers, URLs, street-address patterns and "my name is / I live at / my number is" forms. A hit returns `rejected` / `personal_details`; the text is not logged or stored. Patterns are bounded (no nested quantifiers) and run only on input capped at 300 characters, so there is no regex-denial-of-service. The UI line above the input states the rule in advance. Filtering cannot catch every way of writing personal details, so the privacy notice says so; nothing is stored, which limits the harm.
- **Crisis detection (deterministic, runs first):** self-harm, suicide, abuse and danger phrases return the KB `responses.crisis` text immediately. Decided 2026-11-14: this includes theology questions that mention suicide ("is suicide a sin"); the safer error wins. Phrases are a reviewed list in code, tested with both positive and negative cases (for example "I am dying to know" must not trigger).
- Off-topic and gibberish end in `no_answer` because confidence is low, not because of a topic list.

Abuse and availability
- Rate limits per hashed visitor address (existing Redis limiter): 30 messages per 10 minutes, generic 429 with `Retry-After`; plus a Vercel Firewall rate rule on the chat route. Honeypot and minimum time-to-submit as on sign-up. Turnstile is not needed because a request costs nothing but a few milliseconds of CPU; it can be added if abuse appears.
- Service token required on the endpoint (default-deny `/v1`); client IP only from the BFF after the token check.
- `CHAT_ENABLED=0` kill switch. Endpoint work is bounded: constant-size index, input cap, no external calls, so response time is flat and has no timeout path.

Output and rendering
- All reply text is KB content or fixed strings, rendered as plain text (React escapes it). No `dangerouslySetInnerHTML`, no markdown or HTML parsing of user input, and the visitor's own message is echoed as text only.
- Verse references link only to the internal Bible reader route built from validated book, chapter and verse; there are no external links in answers. The only other link is the `mailto:hello@wordonthewater.net` link.
- KB integrity: schema-validated on load, committed to the repo, changed only by reviewed PR, with the version in every response; a test asserts that every `related`, `glossary` and `entry` reference resolves and that no field contains HTML.

Privacy (GDPR, POPIA)
- Server stores nothing: no message text, no conversation, no analytics events with content. Logs and Sentry get only counts and the outcome kind (`answer`, `clarify`, `no_answer`, `crisis`, `rejected`) and the matched entry id; a test asserts that a message never appears in logs or Sentry events (extend the existing scrubber).
- Browser holds the thread in `sessionStorage` only; **Clear chat** deletes it; it holds no personal data because personal details are rejected before display.
- No cookies added, no third parties, CSP unchanged, no new processors, so `privacy.md` only needs a short "chat" section (what is and is not kept).
- Feedback buttons, if added later, store only an entry id and up or down, never text.

Quality and governance
- Test first (see section 10). There is no pastoral review gate (decided 2026-11-15).
- Threat model additions: input abuse, KB tampering through the repo or build (mitigated by PR review and `kb-check`), reliance on advice (disclaimer, pastor referrals, crisis path).
- Accessibility pass with keyboard, VoiceOver iOS and TalkBack before launch, like the other quality gates.

## 9. Findings that affect the plan

- A plain keyword search over this KB works well when the visitor's wording resembles a stored question (96% first, 99.6% top 3 on the KB's own paraphrases) but is not meaning-aware, and needs a "do enough of the question's words match" rule to refuse off-topic questions. Both are covered by tests in step K2.
- The 16 contested entries need the contested note on every answer; it is a data flag (`contested`), so a test can enforce it.
- Two crisis-related entries (9.11 depression and 10.13 suicide) already contain the South African numbers inside the `explanation`. The chat also runs its own crisis check, so these two entries should be shown with the same tappable numbers, not only buried in text.

## 10. Build plan (small steps, tests first, one PR per step)

- **K0 Bring the KB into the repo.** Get the markdown source from you; commit `kb/faith_kb.md`, `build_kb.py` (run through `uv`) and `faith_kb.json` under `apps/api`. Add `make kb` and `make kb-check`. Ask a pastor to start the review.
- **K1 Load and validate.** Pydantic models for the KB; load once; tests: every id resolves, no HTML, counts match `meta`; measure the cold start.
- **K2 Retrieval (strict TDD).** Index, scoring, confidence bands. Evaluation set as tests (own paraphrases at least 95% first, off-topic to `no_answer`, "who is jesus" and the weather and bread cases). Tune the thresholds from this set.
- **K3 Guards.** Personal details, crisis, input normalisation. Table-driven positive and negative cases.
- **K4 Chat logic.** Intents (small talk, more, why), context boost, seen-entry down-ranking, chips (entry, related, term), contested suffix. Tests for 20 follow-up sequences.
- **K5 Endpoint.** `POST /v1/chat/messages`: schema, service token, rate limit, honeypot, integration tests against real Redis, the no-leak test for logs and Sentry, OpenAPI types regenerated.
- **K6 Web panel.** Dialog, thread, chips, topic browser, `sessionStorage` history, Clear chat, mobile first at 375px, Vitest tests, lazy loaded, the button change in `landing.ts` and `start.tsx` behind `CHAT_ENABLED` with the contact fallback.
- **K7 E2E and quality.** Playwright on the six projects against a stub API, axe in both schemes, bundle size check, a real phone check of the keyboard and safe areas.
- **K8 Docs and launch.** ADR 0009, threat model, privacy notice, runbook (update the KB, kill switch), then enable in Production **(Hendrik)**.

Definition of done follows `PLAN.md`.

## 11. Suggested later steps (not in scope)
- Thumbs up or down per answer (entry id only) to find weak entries; a list of "no answer" counts, never the text.
- Link verse references to the ESV once Crossway approves; show WEB verse text inline.
- A type-ahead list of suggested questions while typing.
- More entries over time, driven by the feedback counts and by questions people email to `hello@`.

## 12. Optional later: LLM layer (not in scope, kept for reference)

If matching proves too rigid after launch, a model could rephrase an answer using only the entries retrieved by K2, never searching the web. That would reintroduce a third party (and the privacy and injection concerns in section 2), so it needs its own ADR, a paid zero-retention model, and a security review first. The system prompt supplied earlier would then be adapted to "answer only from the supplied KB entries". It is kept below for reference and is **not used** by this scope.

<details>
<summary>Superseded system prompt (v1, web search design)</summary>

```
# ROLE
You are a Christian faith study assistant. You help users understand the Christian faith, the Bible, and theology by giving clear, accurate answers drawn ONLY from three approved sources:

1. GotQuestions.org — https://www.gotquestions.org/
2. Bible.org — https://bible.org/
3. BibleProject — https://bibleproject.com/

You are not a pastor, counsellor, or theologian. You are a guide who points users to what these trusted sources teach.

# SOURCE RULES (STRICT)
- Every factual or theological statement in your answer MUST come from content found on one of the three approved sources.
- Before answering, ALWAYS use the web_search tool to find relevant content from the approved sources.
- Do not answer from your own general knowledge, training data, or any other website, book, or commentary, even if you believe you know the answer.
- If the retrieved content does not clearly answer the question, do NOT fill gaps, infer, speculate, or combine ideas into a new conclusion the sources do not state.
- Never invent quotes, article titles, URLs, authors, or Bible references. Only cite a page you actually retrieved.
- Bible verses may be quoted or referenced only as they appear in, or are cited by, the approved sources.

# WHEN NO ANSWER IS FOUND
If none of the approved sources answer the question, or the answer is only partial or unclear, respond with:

"I wasn't able to find a clear answer to this question in my approved sources (GotQuestions.org, Bible.org and BibleProject). I'd encourage you to reach out to a pastor at a church in your local community. They can talk this through with you personally and give you guidance that fits your situation."

If you found a partial answer, share only the part the sources support, say clearly which part you could not find, and then give the referral above.

# ANSWER FORMAT
1. **Answer**: a clear, plain-language summary (2–5 short paragraphs) of what the source(s) teach.
2. **Key Scriptures**: the main Bible references the source uses (if any).
3. **Sources**: a list of the specific pages used, with title and full URL.

Paraphrase in your own words. Do not copy long passages from the sources; keep any direct quote short and clearly marked.

# WHEN SOURCES DIFFER
The three sources sometimes emphasise different things or hold different views on debated topics (e.g. baptism, end times, spiritual gifts, creation, predestination).
- Present each source's view fairly and say which source holds it.
- Do not pick a winner or add your own opinion.
- Note that Christians hold different views on the topic, and suggest the user discuss it with a local pastor.

# TONE
- Respectful, warm, humble and patient.
- Never mock, argue with, or shame users, including users from other faiths or no faith.
- Keep language simple; explain theological terms when you use them.

# SCOPE
- Stay on topic: Christian faith, the Bible, theology, church history and Christian living as covered by the approved sources.
- For unrelated questions, politely say you can only help with questions about the Christian faith and the Bible.
- Do not give medical, legal, financial or psychological advice.
- Do not tell users which church or denomination to join.

# PASTORAL CARE AND SAFETY
If a user expresses grief, crisis, abuse, thoughts of self-harm, or serious personal distress:
- Respond with compassion first. Do not lead with a theology lesson.
- Strongly encourage them to speak to a local pastor, a trusted person, or a professional counsellor.
- If they may be in danger, urge them to contact local emergency services or a crisis helpline immediately: [INSERT LOCAL EMERGENCY / CRISIS NUMBERS].

# HONESTY CHECK (before every response)
Ask yourself:
- Did I use the web_search tool and find content from an approved source?
- Is every claim in my answer supported by a page I actually retrieved from an approved source?
- Have I cited the exact page(s)?
- Am I guessing or filling a gap anywhere?
If you are unsure about any part, remove it or give the pastor referral.
```

</details>

## 13. Decisions and open questions

Decided (2026-11-14):
- **Markdown source:** Hendrik will provide it; it is committed in step K0 as the editable source of truth.
- **Audience:** mainly South Africa. The crisis reply keeps the SADAG and LifeLine numbers and adds one line for visitors elsewhere: "Outside South Africa, please call your local emergency number." No other country numbers are added. Both numbers are verified on the providers' sites before launch.
- **History:** the thread lasts only while the tab is open (`sessionStorage`), with a Clear chat button. No `localStorage`.
- **No AI model in v1:** answers are always knowledge base entries (section 12 stays a parked, separate decision).
- **Content ownership:** the text is original, so we own it.
- **JSON used:** `faith_kb (1).json`.

Still open:
1. **Q5 Reviewer.** Dropped (2026-11-15): no pastoral review is required.
2. **Q6 Panel and placement.** Right-hand drawer on desktop (as drawn) or a centred dialog? Only the Start here section, or also the header and the end of each devotional? Default if unanswered: drawer, Start here only.
3. **Q7 Label.** "Got Questions" (as asked) or "Got questions?" Default: "Got Questions".
4. **Q8 Pastor referral.** `no_answer` tells people to speak to a local pastor. Add the `hello@` mail link for people with no church? Default: yes (there is no contact form at launch).
