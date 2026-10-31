# Code review fix plan

Plan for the 10 findings in [code_review.md](code_review.md). Work starts only after this plan is agreed.

## Rules for every fix

- One branch and one PR per fix (names below), Conventional Commits, merged with `gh pr merge --squash --admin` only when every check is green.
- **Prove the problem first:** write a test that reproduces the finding and fails for the right reason, before changing any code (CLAUDE.md §14, PLAN.md testing approach).
- Then the smallest change that makes the test pass, then `make lint typecheck test` (plus `make e2e` for web changes and `make types-check` for API changes).
- **The last step of each fix checks that the original failure is gone**, in the running system where possible (local app, Vercel preview or production), not only through unit tests.
- Tick the boxes here as work progresses, and tick the finding in `code_review.md` when its PR merges.

## Order

| Order | Fix | Finding | Why this order |
|---|---|---|---|
| 1 | Bytes comparison for tokens | 4 | Smallest; it is also triggerable today on production |
| 2 | Body-size limit for chunked requests | 3 | Same middleware as fix 3; must hold before any POST endpoint |
| 3 | Headers on 413 and 500 responses | 10 | Same middleware; easier once fix 2 has reshaped it |
| 4 | Rate limiter: rejected hits do not count | 5 | Rate limiter must be right before fix 5 builds on it |
| 5 | Real client IP behind the BFF | 1 | Needed before step 1.3's sign-up form |
| 6 | Outbox commits per message, time-capped | 2 | Needed before any real email is queued |
| 7 | CSP proxy matcher | 6 | Web, independent |
| 8 | `make env` | 8 | Tooling, independent |
| 9 | Long branch names in preview API URL | 7 | Docs or small code, independent |
| 10 | Outbox cron frequency | 9 | Docs now; the real fix is a launch decision |

---

## Fix 1: non-ASCII bearer token returns 500 (finding 4)
Branch `fix/token-compare-bytes`. Files: `apps/api/app/core/security.py`, `apps/api/tests/test_security.py`.

- [x] Add tests to `test_security.py`: a non-ASCII token (`Bearer café`) on `/v1/ping` and on `/cron/drain-outbox` must return 401 with `{"error": {"code": "unauthorized", ...}}`, and must not log `unhandled_error`
- [x] Run them and confirm they fail with a 500 (`TypeError` in `security.py`), not for another reason
- [x] Fix `_check`: compare `token.encode()` with `expected.encode()` in `hmac.compare_digest`
- [x] Run the new tests (green) and `make lint typecheck test`
- [x] Open the PR, wait for green checks, merge
- [x] **Test the fix:** on production after the deploy, `curl -H 'Authorization: Bearer café'` to `https://wotw-api.vercel.app/v1/ping` (through the bypass, or on a preview with `vercel curl`) returns 401, not 500, and `vercel logs` shows no `unhandled_error` for it

## Fix 2: body-size limit bypassed by chunked requests (finding 3)
Branch `fix/body-limit-chunked`. Files: `apps/api/app/core/middleware.py`, a new `apps/api/tests/test_middleware.py`.

- [x] Add tests: a chunked POST (no `Content-Length`) with a 20,000-byte body returns 413 `payload_too_large`; a chunked POST under 16 KB is passed through; a `Content-Length` over the limit still returns 413; an invalid `Content-Length` (`abc`) returns 400, not 500
- [x] Run them and confirm the chunked case fails the same way the review reproduced (405 instead of 413)
- [x] Fix: count the bytes actually received. Replace the header-only check with a pure ASGI middleware that wraps `receive`, adds up `http.request` body chunk sizes, and answers 413 as soon as the total passes `MAX_BODY_BYTES` (keep the fast `Content-Length` check too)
- [x] Run the tests (green) and `make lint typecheck test`; check the integration tests (`test_ready`, `test_cron_drain`) still pass
- [x] Open the PR, wait for green checks, merge
- [x] **Test the fix:** reproduce the reviewer's case against the running local API (`uv run uvicorn app.main:app`): `curl -H 'Transfer-Encoding: chunked' --data-binary @20k.bin -X POST localhost:8000/v1/ping` returns 413; repeat on a Vercel preview with `vercel curl`

## Fix 3: 413 and 500 responses miss `X-Request-ID` and `Cache-Control: no-store` (finding 10)
Branch `fix/headers-on-error-responses`. Files: `apps/api/app/core/middleware.py`, `apps/api/app/core/errors.py`, `apps/api/tests/test_middleware.py`.

- [x] Add tests: a 413 response, and a 500 from a route that raises, both carry `X-Request-ID` (32 hex chars, matching the `request_id` in the logged entry) and `Cache-Control: no-store`
- [x] Run them and confirm both fail because the headers are missing
- [x] Fix: set both headers wherever a response leaves the app. Add them in the 413 branch from fix 2, and in `_unhandled` (which can read the request ID from the structlog contextvars)
- [x] Run the tests (green) and `make lint typecheck test`
- [x] Open the PR, wait for green checks, merge
- [x] **Test the fix:** on the running local API, `curl -i` an oversized chunked POST: the 413 shows both headers. Trigger a 500 locally by stopping Postgres and calling `/cron/drain-outbox` with the local `CRON_SECRET`: the 500 shows both headers, and the `X-Request-ID` matches the `request_id` in the log line

## Fix 4: rejected requests extend the rate-limit window (finding 5)
Branch `fix/rate-limit-rejections`. Files: `apps/api/app/core/rate_limit.py`, `apps/api/tests/integration/test_rate_limit.py`.

- [x] Add an integration test against the real local Valkey (no mocks, no real clock: inject the time into `hit()`): with limit 2 and a 60 s window, two hits at t=0 pass, a hit at t=30 is rejected, and a hit at t=61 passes again (today it is still rejected because the t=30 hit was recorded)
- [x] Add a test that the key's TTL is not pushed forward by a rejected hit
- [x] Run them and confirm they fail because the rejected hit was counted
- [x] Fix: inject `now` (default `time.time()`), count the window first, and record the hit only when it is allowed. Use a short Lua script (or `WATCH`/`MULTI`) so the check and the record stay atomic under concurrency
- [x] Add a concurrency test: 10 simultaneous hits against limit 5 allow exactly 5
- [x] Run the tests (green) and `make lint typecheck test`
- [x] Open the PR, wait for green checks, merge
- [x] **Test the fix:** run the integration tests against local Valkey and on CI's Valkey 9. Then exercise it by hand with a small `uv run` script against local Valkey: exhaust the limit, keep hitting during the window, and confirm a hit is allowed again exactly one window after the last *accepted* hit

## Fix 5: all visitors share one rate-limit key behind the BFF (finding 1)
Branch `fix/client-ip-behind-bff`. Files: `apps/api/app/core/rate_limit.py`, `apps/api/app/core/security.py`, `apps/web/src/lib/api-client.ts`, tests on both sides, ADR 0001 note.

- [x] **Prove first which headers the API really receives through the BFF on Vercel.** On a preview, temporarily log the names (not values) of the IP headers seen by `/v1/ping` (`x-real-ip`, `x-vercel-forwarded-for`, `x-forwarded-for`, `x-client-ip`) and whether `x-forwarded-for` from the web server survives Vercel's edge. Record the result in the PR, then remove the temporary log
- [x] Decide the header from that evidence: keep `X-Forwarded-For` if it survives unchanged, otherwise a dedicated `X-Client-IP`
- [x] Add API tests: with a valid service token, `client_ip` uses the BFF header; without a valid service token the BFF header is ignored (a caller cannot choose their own rate-limit key); a malformed value falls back to `x-real-ip`
- [x] Add a web test (`api-client.test.ts`): `apiFetch` sends the chosen header with the visitor's IP
- [x] Run them and confirm they fail for the right reason
- [x] Fix: the API trusts the BFF header only after `require_service_token` has passed (for example, set `request.state.client_ip` in that dependency); the web client sends the chosen header
- [x] Update ADR 0001 (one line on how the client IP travels) and CLAUDE.md §6.3 if the header name changes
- [x] Run the tests (green), `make lint typecheck test`, `make e2e`, `make types-check`
- [x] Open the PR, wait for green checks, merge
- [ ] **Test the fix:** on a preview, call a service-token route through the web BFF from two different networks (for example Wi-Fi and phone data) and confirm, with the same temporary header-name logging or a hashed-IP log line, that the API sees two different client IPs. Repeat in step 1.3's e2e once the sign-up form exists: two simulated visitors do not share a limit

## Fix 6: one commit per outbox batch exceeds `maxDuration` (finding 2)
Branch `fix/outbox-commit-per-message`. Files: `apps/api/app/jobs/drain_outbox.py`, `apps/api/tests/integration/test_outbox.py`, `test_cron_drain.py`.

- [x] Add integration tests against real Postgres with a fake provider:
  - a provider that fails on the 3rd message, then the drain is interrupted (raise after message 3): messages 1 and 2 are `SENT` in the database and are not sent again on the next drain
  - `attempts` is saved for a failing message even if the run is interrupted afterwards
  - with a fake clock and a slow provider, the drain stops starting new sends once its time budget (for example 20 s, safely under `maxDuration` 30 s) is used, and leaves the rest `PENDING`
- [x] Run them and confirm they fail (everything rolls back today; no time budget)
- [x] Fix: commit after each message (claim with `FOR UPDATE SKIP LOCKED` one row at a time, or claim the batch then commit per result), and stop starting new sends once the time budget is used. Keep at-least-once delivery
- [x] Run the tests (green), coverage on `services/` still at least 85%, `make lint typecheck test`
- [x] Open the PR, wait for green checks, merge
- [x] **Test the fix:** locally with Mailpit: enqueue 5 messages, start a drain, stop it after 2 sends (for example kill uvicorn), run it again, and confirm in Mailpit that each message arrived exactly once. Then on production, `vercel crons run /cron/drain-outbox` still logs `outbox_drained` with sent 0, retried 0, failed 0

## Fix 7: proxy matcher skips CSP for paths starting with `api` (finding 6)
Branch `fix/proxy-matcher-api-prefix`. Files: `apps/web/src/proxy.ts`, `apps/web/tests/e2e/csp.spec.ts` (or `proxy.test.ts`).

- [x] Add a test page or route such as `/apologetics` in the e2e setup (or check the matcher regex directly in `proxy.test.ts`): it must get a `Content-Security-Policy` header with a nonce; `/api/health` must still be skipped
- [x] Run it and confirm `/apologetics` has no CSP today
- [x] Fix the matcher: `/((?!api/|_next/static/|_next/image|favicon.ico).*)`
- [x] Run `make lint typecheck test` and `make e2e`
- [x] Open the PR, wait for green checks, merge
- [x] **Test the fix:** on the preview, `vercel curl -I /apologetics` (a 404 page is fine) shows a `content-security-policy` header with a nonce, and `/api/health` still returns `{"status":"ok"}`

## Fix 8: `make env` output is never read by the API (finding 8)
Branch `fix/make-env`. Files: `Makefile`, `CLAUDE.md` §14, `docs/runbooks/deploy.md`.

- [x] Show the problem: run `make env`, then list what `apps/api/.env.local` and `apps/web/.env.local` contain (names only) and confirm the API ignores them
- [x] Decide with Hendrik: remove the `env` target (nothing useful comes down since Development has no variables), or keep it documented as "reference only"
- [x] Apply the decision to the Makefile, CLAUDE.md and the runbook
- [x] Open the PR, wait for green checks, merge
- [x] **Test the fix:** `make help` or the Makefile and CLAUDE.md agree; if kept, `make env` runs cleanly and the docs say it does not affect local runs; if removed, `make env` reports no such target and nothing references it

## Fix 9: preview API URL breaks for long branch names (finding 7)
Branch `fix/preview-api-url-long-branches`. Files: `apps/web/src/lib/env.ts`, `apps/web/tests/unit/env.test.ts`, `docs/runbooks/deploy.md`.

- [x] **Prove the limit:** no throwaway branch needed, an existing long Dependabot branch (48-character slug) already had both previews. Real aliases: web `wotw-web-git-dependabot-npmandyarnappswebno-0b4701-thecodeblock.vercel.app`, API `wotw-api-git-dependabot-npmandyarnappswebno-5dfe3b-thecodeblock.vercel.app` (both labels 63 characters, hash differs per project, so the swapped host does not exist). `/api/health` 503 not curled: previews sit behind Deployment Protection
- [x] Decide from the evidence: the hash is per project and unpredictable, so keep branch names to 36 characters or fewer (rule in CLAUDE.md §14) plus a clear error in `env.ts` when the alias label reaches 63 characters; reading the alias from the Vercel API at build time would need a Vercel token in the build, rejected as over-engineering
- [x] Add a unit test for the chosen behaviour (truncated alias gives an error naming the cause; longest untruncated alias still derives; an explicit `API_BASE_URL` still wins)
- [x] Run it, confirm it fails, implement, run `make lint typecheck test` (test failed with "expected to throw", then 12 env tests, 52 web tests and 80 API tests pass; `make e2e` left to CI)
- [x] Open the PR, wait for green checks, merge: PR #41, all 14 checks green, merged as `0b9abb3` (no throwaway branch was created)
- [x] **Test the fix (skipped by Hendrik, 2026-10-31, to save Vercel deployments; the unit test uses the real alias data):** repeat the long-branch preview. Either `/api/health` returns ok (if the alias is now resolved) or the failure names the cause in the logs, and a short branch name still works

## Fix 10: outbox cron is daily, docs promise every 5 minutes (finding 9)
Branch `docs/outbox-cron-frequency`. Files: `CLAUDE.md` §2, `PLAN.md` (1.3 and 1.9), `docs/runbooks/deploy.md`.

- [x] Correct CLAUDE.md §2: daily on Hobby (Vercel limit), `*/5` after moving to Pro, and the planned immediate best-effort send after each request
- [x] Add to PLAN.md 1.3: "immediate best-effort send after enqueue" with a test, and to 1.9 (launch): "Pro plan and outbox cron `*/5`" **(Hendrik)**
- [x] Open the PR, wait for green checks, merge
- [x] **Test the fix:** CLAUDE.md, the runbook and `apps/api/vercel.json` give the same schedule. The real check comes at launch: a confirmation email reaches Mailpit (local) or the inbox (production) within 5 minutes of signing up

## Close-out

- [x] All 10 findings ticked in `code_review.md`, with the PR number for each (Fixed column in the summary table; finding 1's live two-network check waits for step 1.3's e2e)
- [x] Re-run `/code-review` (high) on the 11 changed source files: not clean, 10 further findings, handled as Fixes 11 to 20 in the addendum below
- [x] Archived with this plan under `docs/reviews/2026-10-31/`, as Hendrik chose (2026-10-31)

---

# Addendum: findings from the re-review (Fixes 11 to 20)

The re-run of `/code-review` after Fixes 1 to 10 reported 10 more findings. They are claims until proven: each fix starts with a test that fails for the right reason, and a finding the test cannot reproduce is dropped here with the evidence.

**One branch, one PR, one merge (Hendrik's decision).** The rules above say one PR per fix. Hobby allows 100 deployments per day per team and every non-docs push creates 2 (plus 2 canceled ones on merge). A push of Fixes 11 and 12 (PR #43) was already refused with "Deployment rate limited, retry in 24 hours" for `wotw-api`. So Fixes 11 to 20 are one commit each on `fix/client-ip-hardening`, pushed once at the end, with one PR (#43) and one merge. The first push of Fixes 11 and 12 is already on the PR.

Same rules as above: test first, `make lint typecheck test` (plus `make e2e` for web, `make types-check` for API), merge with `gh pr merge --squash --admin` when every check is green.

## Fix 11: a missing or malformed `X-Client-IP` silently shares one rate-limit key
Introduced by Fix 5. `apps/api/app/core/security.py`, `apps/api/app/core/rate_limit.py`, `apps/api/tests/test_client_ip.py`.

- [x] Test: with a valid service token and a missing or malformed `X-Client-IP`, a warning is logged (no header values), so the fallback to the proxy address is visible. Failed first (no log today), passes now
- [x] Log `client_ip_fallback` when `client_ip` falls back to a proxy header or the socket address (every rate-limited route sits behind the service token, so a fallback there is always the missing BFF IP)
- [x] Add a PLAN.md 1.3 item: every visitor-facing `apiFetch` passes `clientIp`, with a test that two visitors do not share a limit
- [x] Decision kept from Fix 5: a malformed value falls back instead of rejecting, so a BFF bug cannot take sign-up down; the warning makes it visible

## Fix 12: IPv6 visitors get a fresh rate-limit bucket per address
Introduced by Fix 5. `apps/api/app/core/rate_limit.py`, `apps/api/tests/test_client_ip.py`.

- [x] Test: two addresses in the same /64 give the same rate-limit subject; an IPv4-mapped IPv6 address equals its IPv4 form; plain IPv4 and non-IP values are unchanged; the BFF's IPv6 address is reduced too. The three real cases failed first, the guards passed
- [x] `limit_subject` in `rate_limit.py`, applied to every path in `client_ip`: IPv4-mapped to IPv4, other IPv6 to its /64 network address; non-IP strings pass through
- [x] Update CLAUDE.md §6.3 (limit is per /64 for IPv6)

## Fix 13: the outbox time budget is only checked before a send
Introduced by Fix 6. `apps/api/app/jobs/drain_outbox.py`, `apps/api/tests/integration/test_outbox.py`.

- [ ] Test: a send that hangs is cut off at a hard per-send cap and the row is recorded as a failed attempt with backoff, within the run budget. Confirm it hangs or overruns today
- [ ] Wrap each send in `asyncio.timeout(SEND_TIMEOUT)` with `SEND_TIMEOUT` plus the budget below the function's `maxDuration`
- [ ] Note in the PR: a send cut off after the provider accepted it can still be duplicated on retry, as with any timeout

## Fix 14: `previewApiUrl` does not check that the `wotw-web-` prefix matched
Introduced by Fix 9. `apps/web/src/lib/env.ts`, `apps/web/tests/unit/env.test.ts`.

- [ ] Test: a preview `VERCEL_BRANCH_URL` that does not start with `wotw-web-` gives a clear error, not the web host as the API URL. Confirm it fails
- [ ] Throw naming the unexpected host

## Fix 15: `_http_error` drops `exc.headers`; 429 has no `Retry-After`
Present since Phase 0.3. `apps/api/app/core/errors.py`, `apps/api/app/core/rate_limit.py`, tests.

- [ ] Test: a 405 keeps its `Allow` header; an `HTTPException(401, headers=WWW-Authenticate)` keeps it; a rate-limited 429 carries `Retry-After`. Confirm they fail
- [ ] Pass `exc.headers` through; give `ApiError` optional headers and set `Retry-After` (the window length) on the rate limiter's 429

## Fix 16: the Redis client has no read timeout
Present since Phase 0.4. `apps/api/app/core/rate_limit.py`, `apps/api/tests/integration/test_rate_limit.py`.

- [ ] Test: the client from `get_redis` has a socket timeout (read as well as connect). Confirm it fails
- [ ] Add `socket_timeout=2`. Not changed on purpose: a connection per request (the serverless norm here) and failing closed when Redis is down (forms should not accept unlimited requests)

## Fix 17: a trailing slash on `API_BASE_URL` produces `//v1/...`
Present since Phase 0.6. `apps/web/src/lib/env.ts`, `apps/web/tests/unit/env.test.ts`.

- [ ] Test: `API_BASE_URL` with a trailing slash gives a request URL with a single slash. Confirm it fails
- [ ] Strip trailing slashes when parsing the variable

## Fix 18: `x-forwarded-proto` as a list drops `upgrade-insecure-requests`
Present since Phase 0.8. `apps/web/src/proxy.ts`, `apps/web/tests/unit/proxy.test.ts`.

- [ ] Test: `x-forwarded-proto: https, http` still adds `upgrade-insecure-requests`. Confirm it fails
- [ ] Use the first value of the header

## Fix 19: `make types-check` ignores untracked generated files
Present since Phase 0.7. `Makefile`.

- [ ] Prove: create an untracked file under `packages/api-types`, run `make types-check`, confirm it passes (wrongly)
- [ ] Fail on any `git status --porcelain -- packages/api-types` output; rerun the proof and confirm it now fails; remove the file

## Fix 20: `_unhandled` assumes a non-empty traceback
Present since Phase 0.3. `apps/api/app/core/errors.py`, `apps/api/tests/test_errors.py`.

- [ ] Test: an exception with no traceback frames still gives the 500 JSON body with `X-Request-ID` and `no-store`, and is logged. Confirm it fails
- [ ] Guard the empty traceback

## Addendum close-out

- [ ] All of Fixes 11 to 20 merged (or dropped with evidence) and ticked above
- [ ] Re-run `/code-review` on the files changed by Fixes 11 to 20
- [ ] Archive note: update the Fixed column in `code_review.md` with a row per addendum fix
