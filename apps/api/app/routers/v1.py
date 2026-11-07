"""Versioned API. Every route here requires the service token (default deny)."""

from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Header, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import RateLimiter, client_ip, get_rate_limiter, get_redis
from app.db.session import get_session
from app.integrations.turnstile import TurnstileUnavailableError, TurnstileVerifier
from app.schemas.subscribers import SubscribeRequest, SubscribeResponse
from app.services.bot_checks import automated_reason
from app.services.idempotency import IdempotencyStore
from app.services.subscribers import request_subscription

log = structlog.get_logger()
router = APIRouter(tags=["v1"])

# Sign-ups allowed per hour: per visitor address, and per email so nobody can be mail-bombed.
SIGNUPS_PER_IP = 5
SIGNUPS_PER_EMAIL = 3
SIGNUP_WINDOW_SECONDS = 3600
IdempotencyKey = Annotated[
    str | None,
    Header(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$"),
]


def turnstile_verifier(settings: Annotated[Settings, Depends(get_settings)]) -> TurnstileVerifier:
    if settings.turnstile_secret_key is None:
        log.error("turnstile_not_configured")
        raise ApiError(503, "turnstile_unavailable", "Sign-up is not available right now.")
    return TurnstileVerifier(settings.turnstile_secret_key.get_secret_value())


@router.get("/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/subscribers", status_code=202)
async def subscribe(
    request: Request,
    data: SubscribeRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    turnstile: Annotated[TurnstileVerifier, Depends(turnstile_verifier)],
    limiter: Annotated[RateLimiter, Depends(get_rate_limiter)],
    redis: Annotated[Redis, Depends(get_redis)],
    idempotency_key: Annotated[IdempotencyKey, Header()] = None,
) -> SubscribeResponse:
    """202 with the same body for a new, pending or confirmed address, and for a simple bot.

    A repeat of a request that already worked (same Idempotency-Key and address) returns the same
    answer without doing anything, so it costs no Turnstile token and no allowance. Otherwise: the
    rate limits, then the cheap bot checks (a bot never costs a Cloudflare call), then Turnstile.
    A token Cloudflare refuses is a 400; if it cannot judge it, a 503 and nothing is stored, so a
    sign-up is never accepted unchecked. A failed attempt gives its key back for the retry.
    """
    idempotency = IdempotencyStore(redis, settings.ip_hash_salt.get_secret_value())
    scope, key = "signup", f"{idempotency_key}:{data.email}"
    if idempotency_key and not await idempotency.claim(scope, key):
        return SubscribeResponse()
    try:
        await _sign_up(request, data, session, settings, turnstile, limiter)
    except BaseException:
        if idempotency_key:
            await idempotency.release(scope, key)
        raise
    if idempotency_key:
        await idempotency.complete(scope, key)
    return SubscribeResponse()


async def _sign_up(
    request: Request,
    data: SubscribeRequest,
    session: AsyncSession,
    settings: Settings,
    turnstile: TurnstileVerifier,
    limiter: RateLimiter,
) -> None:
    ip = client_ip(request)
    await limiter.hit("signup_ip", ip, SIGNUPS_PER_IP, SIGNUP_WINDOW_SECONDS)
    await limiter.hit("signup_email", data.email, SIGNUPS_PER_EMAIL, SIGNUP_WINDOW_SECONDS)
    reason = automated_reason(data, datetime.now(UTC), settings.signup_min_seconds)
    if reason:
        log.info("signup_bot_rejected", reason=reason)
        return
    try:
        verified = await turnstile.verify(data.turnstile_token, ip)
    except TurnstileUnavailableError as exc:
        log.error("turnstile_unavailable")
        raise ApiError(503, "turnstile_unavailable", "Sign-up is not available right now.") from exc
    if not verified:
        raise ApiError(400, "turnstile_failed", "The check did not pass. Please try again.")
    await request_subscription(session, data)
