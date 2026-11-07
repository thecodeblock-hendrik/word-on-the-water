"""Versioned API. Every route here requires the service token (default deny)."""

from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import client_ip
from app.db.session import get_session
from app.integrations.turnstile import TurnstileUnavailableError, TurnstileVerifier
from app.schemas.subscribers import SubscribeRequest, SubscribeResponse
from app.services.bot_checks import automated_reason
from app.services.subscribers import request_subscription

log = structlog.get_logger()
router = APIRouter(tags=["v1"])


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
) -> SubscribeResponse:
    """202 with the same body for a new, pending or confirmed address, and for a simple bot.

    The cheap bot checks run first so a bot never costs a Cloudflare call. A token Cloudflare
    refuses is a 400 (the visitor solves the challenge again); if Cloudflare cannot judge it,
    a 503 and nothing is stored, so a sign-up is never accepted unverified.
    """
    reason = automated_reason(data, datetime.now(UTC), settings.signup_min_seconds)
    if reason:
        log.info("signup_bot_rejected", reason=reason)
        return SubscribeResponse()
    try:
        verified = await turnstile.verify(data.turnstile_token, client_ip(request))
    except TurnstileUnavailableError as exc:
        log.error("turnstile_unavailable")
        raise ApiError(503, "turnstile_unavailable", "Sign-up is not available right now.") from exc
    if not verified:
        raise ApiError(400, "turnstile_failed", "The check did not pass. Please try again.")
    await request_subscription(session, data)
    return SubscribeResponse()
