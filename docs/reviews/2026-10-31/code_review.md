# Code review

Date: 2026-10-31. Reviewer: Claude Code `/code-review` skill (effort: high), run on `main` at the end of step 0.9.

Scope: `apps/`, `packages/`, `scripts/`, `db/`, `docker/`, `.github/`, `Makefile`, `docker-compose.yml`. `main` had no pending diff, so the review covered the files as they stand.

Findings are ordered most severe first. **Reproduced** means the reviewer triggered the failure with the FastAPI TestClient. The others come from reading the code and were not run. Notes in *italics* are added context from the session that built step 0.9.

## Summary

| # | Area | Finding | Status | Fixed |
|---|---|---|---|---|
| 1 | API rate limiting | All visitors share one rate-limit key behind the BFF | Not run | [x] #31 (live two-network check waits for step 1.3's e2e) |
| 2 | API outbox | One commit per batch exceeds `maxDuration`; duplicate sends, attempts never saved | Not run | [x] #32 |
| 3 | API middleware | Body-size limit bypassed by chunked requests | **Reproduced** | [x] #28 |
| 4 | API auth | Non-ASCII bearer token gives 500 instead of 401 | **Reproduced** | [x] #27 |
| 5 | API rate limiting | Rejected requests extend the window; retrying clients stay blocked | Not run | [x] #30 |
| 6 | Web CSP | Proxy matcher skips CSP for any path starting with `api` | Not run | [x] #33 |
| 7 | Web previews | Derived API preview URL breaks for long branch names | Not run | [x] #41 (mitigated: clear error plus a 36 character branch-name rule) |
| 8 | Tooling | `make env` output is never read by the API | Not run | [x] #35 (target removed) |
| 9 | Ops / docs | Outbox cron is daily, but docs promise every 5 minutes | Not run | [x] #36 (docs corrected; the real fix is Pro and `*/5` at launch, PLAN.md 1.9) |
| 10 | API middleware | 413 and 500 responses miss `X-Request-ID` and `Cache-Control: no-store` | Not run | [x] #29 |

Related fix found along the way: #34 (Vercel `ignoreCommand` exit 128).

### Re-review of the fixes (2026-10-31)

Re-running `/code-review` (high) on the files changed by fixes 1 to 10 gave 10 further findings. Each was checked with a test that failed first. All fixed in PR #43 (one commit per fix); details in the addendum of `code_review_plan.md`.

| Fix | Finding | Origin |
|---|---|---|
| 11 | Missing or malformed `X-Client-IP` silently shares one rate-limit key (now logged) | Fix 5 |
| 12 | IPv6 visitors got a fresh rate-limit bucket per address (now per /64) | Fix 5 |
| 13 | Outbox time budget only checked before a send (now a per-send cap) | Fix 6 |
| 14 | `previewApiUrl` did not check the `wotw-web-` prefix | Fix 9 |
| 15 | Error handler dropped `exc.headers`; 429 had no `Retry-After` | Phase 0.3 |
| 16 | Redis client had no read timeout | Phase 0.4 |
| 17 | Trailing slash on `API_BASE_URL` produced `//v1/...` | Phase 0.6 |
| 18 | `x-forwarded-proto` list dropped `upgrade-insecure-requests` | Phase 0.8 |
| 19 | `make types-check` ignored untracked generated files | Phase 0.7 |
| 20 | `_unhandled` crashed on an exception without traceback frames | Phase 0.3 |

## Findings

### 1. All visitors share one rate-limit key behind the BFF
`apps/api/app/core/rate_limit.py:19`

`client_ip` reads only `x-real-ip` and `x-vercel-forwarded-for`. It ignores the `X-Forwarded-For` header that the BFF sends with the visitor's IP (`apps/web/src/lib/api-client.ts:18`, ADR 0001). On Vercel, the API therefore sees the web function's egress IP for every visitor.

**Failure:** in production, Server Actions call the API from the web server, so every visitor hashes to the same `rl:signup:<hash>` key. The sixth sign-up in an hour, across the whole site, gets a 429 for everyone, and a single abuser can lock out all real users.

*Note: the BFF's forwarded IP can only be trusted on requests that carry a valid service token. Vercel may also overwrite `X-Forwarded-For` at its edge, so the fix probably needs its own header, for example `X-Client-IP`, set by the web server and read only after `require_service_token` passes. Fix this before step 1.3 adds the first rate-limited endpoint.*

### 2. One commit per outbox batch exceeds the function's time limit
`apps/api/app/jobs/drain_outbox.py:61`

The batch is committed once, after all sends. Up to 20 sends with a 10 s provider timeout each can take about 200 s, far beyond `maxDuration: 30` (`apps/api/vercel.json:7`).

**Failure:** if Postmark slows down and three sends time out, Vercel kills the invocation at 30 s and the transaction rolls back. Emails already sent in that batch stay `PENDING` and are sent again on the next run. `attempts` is never saved, so a message that keeps failing never reaches `FAILED` and repeats on every run. Row locks are also held during the external HTTP calls.

*Suggested direction: commit per message (or claim rows first, then send, then record each result), and cap the batch by elapsed time well under `maxDuration`.*

### 3. Body-size limit bypassed by chunked requests (reproduced)
`apps/api/app/core/middleware.py:22`

The 16 KB limit only checks the `Content-Length` header, so a chunked request with no `Content-Length` skips it.

**Failure (reproduced):** `POST /v1/ping` with a 20,000-byte chunked body returned 405, not 413. A client using `Transfer-Encoding: chunked` can send bodies of any size to any future POST endpoint, which defeats the limit required by CLAUDE.md §6.3.

### 4. Non-ASCII bearer token gives 500 instead of 401 (reproduced)
`apps/api/app/core/security.py:14`

`hmac.compare_digest` is given `str` values and raises `TypeError` when the header contains non-ASCII characters.

**Failure (reproduced):** `Authorization: Bearer café` on `/v1/ping` returned 500 `internal_error` and logged `unhandled_error TypeError security.py:14`. Anyone can trigger error-rate alerts and Sentry noise on any `/v1` or `/cron` route without credentials.

**Fix:** compare `token.encode()` with `expected.encode()`.

*Note: this is visible now only because unhandled errors started being logged (#21).*

### 5. Rejected requests extend the rate-limit window
`apps/api/app/core/rate_limit.py:40`

`ZADD` records every hit, including ones rejected with 429, and each hit resets the key's TTL.

**Failure:** a mobile user on a flaky connection hits the 5-per-hour sign-up limit and keeps retrying every few minutes. Each 429 adds an entry, so the window always holds more than 5 and the user stays blocked for as long as they retry, instead of one hour after their last accepted request.

**Fix:** count first, and add an entry only when the request is allowed (or remove the entry again on rejection), inside the same pipeline.

### 6. Proxy matcher skips CSP for any path starting with `api`
`apps/web/src/proxy.ts:32`

The negative lookahead `(?!api|...)` excludes every path that begins with the letters `api`, not just `/api/`.

**Failure:** a future page such as `/apiary`, `/apologetics` or `/api-docs` skips `proxy()` and is served with no Content-Security-Policy, silently dropping the XSS protection.

**Fix:** use `api/` (and `_next/static/`) in the lookahead, and add a test with a path like `/apologetics`.

### 7. Derived API preview URL breaks for long branch names
`apps/web/src/lib/env.ts:16`

`previewApiUrl` builds the API preview host by swapping the `wotw-web-` prefix in `VERCEL_BRANCH_URL`. Vercel truncates branch aliases longer than 63 characters and appends a hash of the full name, so the API's alias for a long branch name is different.

**Failure:** a branch like `feat/1.3-subscriber-double-opt-in-confirmation` gives a truncated, hashed alias. The swapped hostname does not exist, so every API call from that preview fails and `/api/health` returns 503.

*Note: a known limitation of the approach chosen in 0.9 (both project names are 8 characters, but the hash covers the full name). Cheapest mitigation: keep branch names short and document the limit. Robust fix: resolve the API alias through the Vercel API at build time, or set `API_BASE_URL` per branch when needed.*

### 8. `make env` output is never read by the API
`Makefile:51`

`make env` pulls the API's Vercel variables into `apps/api/.env.local`. But `Settings` reads only `REPO_ROOT/.env` (`apps/api/app/core/config.py:17`), and `make migrate` uses `--env-file ../../.env`.

**Failure:** a developer runs `make env` and then starts uvicorn or `make migrate`. The API still uses the local Docker values from the root `.env` (or fails without one), and the pulled file is silently ignored.

*Note: since the integrations were disconnected from Development, the pulled files contain almost nothing anyway. Either document `make env` as "for reference only" or remove the target.*

### 9. Outbox cron is daily, but the docs promise every 5 minutes
`apps/api/vercel.json:11`

The drain runs at `0 5 * * *`. CLAUDE.md §2 says "drain email outbox (every 5 min)", and the immediate best-effort send after the request does not exist yet.

**Failure:** a visitor who subscribes at 05:01 UTC gets the confirmation email up to about 24 hours later. With the 48 h link expiry, the usable window is halved.

*Note: daily is forced by the Hobby plan (documented in `docs/runbooks/deploy.md`). Before launch, either move to Pro and `*/5`, or build the immediate best-effort send planned in CLAUDE.md §2. CLAUDE.md §2 should say this until then.*

### 10. 413 and 500 responses miss `X-Request-ID` and `Cache-Control: no-store`
`apps/api/app/core/middleware.py:23`

The early 413 return, and every unhandled 500 (produced by Starlette's `ServerErrorMiddleware`, which sits outside this middleware), skip the lines that set `X-Request-ID` and `Cache-Control: no-store`.

**Failure:** a 500 such as the one in finding 4 goes out without `no-store` and without a request ID. That breaks CLAUDE.md §6.2, and the `request_id` in the logs cannot be matched to what the client received.

## Suggested order of work

1. Before step 1.3 (first public form): findings 1, 3, 4 and 5, with tests that fail first, as the testing approach requires.
2. Before any real email is queued: finding 2, plus finding 9 (Pro and `*/5`, or the immediate send).
3. Small fixes, any time: findings 6, 8 and 10, and documenting finding 7.
