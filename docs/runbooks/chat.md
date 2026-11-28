# Runbook: Ask the Word chat

Scope: [chat.md](../archive/chat.md). Decision: [ADR 0009](../adr/0009-chat-local-knowledge-base.md). The chat answers from a local knowledge base (KB). No model, no search, nothing stored on the server.

## Turn it off or on

- The switch is `CHAT_ENABLED` (`1` is on, unset or blank is off) on **both** Vercel projects, `wotw-web` and `wotw-api`. Redeploy after changing it.
- Off: the landing page shows "Talk to someone" (a mail link to `hello@wordonthewater.net`) and the API answers `503 chat_unavailable`.
- Turn it off first if a wrong or harmful answer is reported, then fix the KB.

## Change an answer or add one

1. Edit `apps/api/kb/faith_kb.md`. An entry is a `###` heading, an `Also asked` line, a short answer, an explanation, key verses and tags. Paraphrases a visitor might type belong in `Also asked`: matching is by words.
2. `make kb` rebuilds `apps/api/app/data/faith_kb.json` and `apps/web/src/content/chat-topics.json`. `make kb-check` (and CI) fails if either is stale.
3. Run `make test`: the evaluation tests in `apps/api/tests/test_chat_search.py` must still pass (own questions, the real-world and the off-topic sets). Add the new wording to `tests/chat_eval/real_world.py` when a visitor's phrasing was missed.
4. Open a pull request. Reviewing the wording is the check on doctrine (no pastoral gate, decided 2026-11-15).
5. The knowledge base ships inside the API, so the change is live only when the new `wotw-api` production build is **promoted by hand** (auto-promotion is off): Vercel, `wotw-api`, Deployments, the build for your merge, Promote, or `vercel promote <url>` from `apps/api`. Then ask the new wording on the live chat.
6. Check the diff of `faith_kb.json`: the "related questions" lists are computed from each entry's text, so a paraphrase can reshuffle other entries' lists (one paraphrase on 2.1 moved two, two moved five). Prefer one wording per fix, and re-pin the conversation tests only if the new lists are better.

## Typed glossary words and spelling

- The glossary (section 15 of `faith_kb.md`, a table of term, meaning, key verses and full entries) is looked up when someone types only a term or alias ("define lord", "what does covenant mean", "messiah"), but only when the search is not confident, so a question with its own entry keeps its full answer. A bare "amen" is small talk on purpose.
- To add a term, add a table row (put aliases in brackets after the term, for example `Saviour (Savior)`), run `make kb`, and add a case to `tests/test_chat_terms.py` (every glossary name in six phrasings must get an answer). A very common word ("lord" is in 28 answers) goes on `COMMON` in `kb/build_kb.py`, or it becomes a chip on every answer that contains it.
- British and American spellings are folded together before matching (honour and honor, baptise and baptize, judgement and judgment), so no paraphrase is needed for those. `tests/test_kb_spelling.py` lists the pairs.
- Do not loosen the no-answer thresholds to catch a missed question: off-topic questions can score as high as 20.8 and only the coverage check keeps them out. Add the wording to the entry instead (ADR 0009, Updates).

## Crisis numbers

They live in the KB's `responses.crisis` text (SADAG 0800 567 567, LifeLine 0861 322 322; checked on the providers' sites 2026-11-15). Re-check them each year, edit the markdown, run `make kb`.

## What is logged

One line per request: `chat_reply` with the kind (`answer`, `clarify`, `no_answer`, `crisis`, `smalltalk`, `rejected`, `term`), the matched entry id and the milliseconds. Bots give `chat_bot_rejected` with a reason. Never any text. Read them in Vercel's logs for the API project.

Weekly in the first month: the share of `no_answer` and `clarify` lines. A high share means missing questions or wording; add them by pull request. Per-question detail does not exist by design.

## Rate limit

30 messages per 10 minutes per visitor address (`CHAT_LIMIT`, `CHAT_WINDOW_SECONDS`); a bot check rejects a message sent under `CHAT_MIN_SECONDS` (0.5) after the panel opened. A visitor over the limit sees "You have asked a lot of questions". A Vercel Firewall rate-limit rule on the web project covers the chat too (set up 2026-11-21, matched by Server Action name, since the browser never calls the API: [deploy.md](deploy.md), "Firewall rules").

## Where things are

| What | Where |
|---|---|
| KB source and builder | `apps/api/kb/faith_kb.md`, `build_kb.py` |
| Retrieval, guards, conversation | `apps/api/app/services/kb_search.py`, `chat_guards.py`, `chat.py` |
| Endpoint | `apps/api/app/routers/chat.py` |
| Panel | `apps/web/src/components/chat/` |
| Thread storage | the visitor's tab (`sessionStorage`, key `wotw-chat`) |
