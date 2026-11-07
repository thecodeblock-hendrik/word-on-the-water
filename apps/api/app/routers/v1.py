"""Versioned API. Every route here requires the service token (default deny)."""

from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.schemas.subscribers import SubscribeRequest, SubscribeResponse
from app.services.bot_checks import automated_reason
from app.services.subscribers import request_subscription

log = structlog.get_logger()
router = APIRouter(tags=["v1"])


@router.get("/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/subscribers", status_code=202)
async def subscribe(
    data: SubscribeRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SubscribeResponse:
    """Always 202 with the same body, whether the address is new, pending, confirmed or a bot."""
    reason = automated_reason(data, datetime.now(UTC), settings.signup_min_seconds)
    if reason:
        log.info("signup_bot_rejected", reason=reason)
    else:
        await request_subscription(session, data)
    return SubscribeResponse()
