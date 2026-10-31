# 0004. Email provider and outbox

Status: accepted (Postmark assumed until confirmed)

## Context
Email must not block requests, must be retryable, and the provider must be swappable.

## Decision
Define an `EmailProvider` interface with Postmark, Mailpit (SMTP) and console implementations. Mail is written to an `email_outbox` table in the same transaction as the business write, drained by a Vercel Cron job every 5 minutes plus a best-effort immediate send. Mail is sent from `hello@wordonthewater.net` on the root domain, authenticated with SPF, DKIM and DMARC (updated 2026-10-31: the registered addresses are on the root domain, so no `mail.` subdomain). Postmark carries transactional mail only; newsletters and subscriber confirmation moved to Kit (see CLAUDE.md section 12 and the planned ADR 0008).

## Consequences
- No lost emails if the provider is down; delivery is at-least-once, so templates and sends must tolerate duplicates.
- Newsletter sending is decided in Phase 2; our subscriber table stays the source of truth.
