# Runbook: Got Questions chat

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

## Crisis numbers

They live in the KB's `responses.crisis` text (SADAG 0800 567 567, LifeLine 0861 322 322; checked on the providers' sites 2026-11-15). Re-check them before launch and each year, edit the markdown, run `make kb`.

## What is logged

One line per request: `chat_reply` with the kind (`answer`, `clarify`, `no_answer`, `crisis`, `smalltalk`, `rejected`, `term`), the matched entry id and the milliseconds. Bots give `chat_bot_rejected` with a reason. Never any text. Read them in Vercel's logs for the API project.

Weekly in the first month: the share of `no_answer` and `clarify` lines. A high share means missing questions or wording; add them by pull request. Per-question detail does not exist by design.

## Rate limit

30 messages per 10 minutes per visitor address (`CHAT_LIMIT`, `CHAT_WINDOW_SECONDS`); a bot check rejects a message sent under `CHAT_MIN_SECONDS` (0.5) after the panel opened. A visitor over the limit sees "You have asked a lot of questions". Add a Vercel Firewall rate-limit rule on `/v1/chat/messages` at launch.

## Where things are

| What | Where |
|---|---|
| KB source and builder | `apps/api/kb/faith_kb.md`, `build_kb.py` |
| Retrieval, guards, conversation | `apps/api/app/services/kb_search.py`, `chat_guards.py`, `chat.py` |
| Endpoint | `apps/api/app/routers/chat.py` |
| Panel | `apps/web/src/components/chat/` |
| Thread storage | the visitor's tab (`sessionStorage`, key `wotw-chat`) |
