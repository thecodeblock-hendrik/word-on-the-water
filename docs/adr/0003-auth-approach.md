# 0003. Authentication approach

Status: accepted (Phase 1 has no login; Phase 2 details to be confirmed)

## Context
Phase 1 is a public page with forms and no accounts. An admin area arrives in Phase 2 and must protect sensitive prayer requests.

## Decision
- Phase 1: no public login. RBAC tables are not created until Phase 2.
- Phase 2 admin: passkey (WebAuthn) or email magic link, with a mandatory second factor for admins. Sessions are opaque random IDs stored server-side, sent as `__Host-` cookies (`HttpOnly; Secure; SameSite=Lax; Path=/`), 30 minute admin idle timeout. No JWTs in localStorage.
- Roles `admin`, `editor`, `prayer_team`; every admin endpoint declares its permission and defaults to deny. An audit log records views and changes of prayer requests.
- Public accounts, if ever added (Phase 4): passkeys or Argon2id, breached-password check, lockout, email verification.

## Consequences
- Smaller attack surface at launch.
- A follow-up ADR records the final Phase 2 choice before implementation.
