# 0006. Application-layer encryption of prayer requests

Note 2026-11-22: the same scheme protects crew prayer requests ([ADR 0012](0012-prayer-crews.md)), which are stored in their own table and have no admin view.

Status: accepted

## Context
Prayer requests can contain religious belief, health and family details, which are special-category personal data.

## Decision
Prayer request bodies are encrypted in the API with AES-256-GCM (`cryptography`) using envelope encryption. The key lives in the secret manager, and a `key_id` is stored per row so keys can rotate. Plaintext never appears in logs, Sentry or analytics. Notification emails include the text only when the requester consents; otherwise they say a new request is waiting. Rows are deleted after 90 days.

## Consequences
- A database leak alone does not expose request text.
- Losing the key loses the data, so key backup and rotation are in the runbook.
- Decryption happens only in the Phase 2 admin view, with an audit log entry.
