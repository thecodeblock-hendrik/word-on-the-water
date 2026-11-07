"""Inbound webhooks. They carry no service token: the provider's signature is the credential."""

import time
from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Header, Request
from pydantic import ValidationError
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import get_redis
from app.db.session import get_session
from app.integrations.kit.webhook import verify_signature
from app.schemas.kit_webhook import KitDelivery
from app.services.idempotency import IdempotencyStore
from app.services.kit_events import apply_kit_event

log = structlog.get_logger()
router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])


@router.post("/kit")
async def kit_webhook(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
    redis: Annotated[Redis, Depends(get_redis)],
    settings: Annotated[Settings, Depends(get_settings)],
    x_kit_signature: Annotated[str | None, Header()] = None,
) -> dict[str, int]:
    """Apply Kit's subscriber events. Answers 2xx once every event is handled, else Kit retries.

    Checked in order: a secret is configured (503), the signature over the raw bytes is valid and
    recent (401), the body is a delivery (400). The body-limit middleware allows up to 1 MB here.
    Each event is applied once: its id is claimed first, and given back if applying it fails, so
    a retry is not mistaken for a duplicate.
    """
    if settings.kit_webhook_secret is None:
        log.error("kit_webhook_not_configured")
        raise ApiError(503, "webhook_not_configured", "Webhooks are not available right now.")
    raw = await request.body()  # the size limit is the body-limit middleware's job
    secret = settings.kit_webhook_secret.get_secret_value()
    if not verify_signature(x_kit_signature, raw, secret, time.time()):
        log.warning("kit_webhook_bad_signature")
        raise ApiError(401, "invalid_signature", "Invalid signature.")
    try:
        delivery = KitDelivery.model_validate_json(raw)
    except ValidationError as exc:
        raise ApiError(400, "bad_request", "Invalid request.") from exc

    seen = IdempotencyStore(redis, settings.ip_hash_salt.get_secret_value())
    updated = 0
    for event in delivery.events:
        if not await seen.claim("kit_event", event.id):
            continue
        try:
            updated += await apply_kit_event(session, event, datetime.now(UTC))
        except BaseException:
            await seen.release("kit_event", event.id)
            raise
        await seen.complete("kit_event", event.id)
    log.info("kit_webhook_received", events=len(delivery.events), updated=updated)
    return {"received": len(delivery.events)}
