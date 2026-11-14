"""Endpoints called by Vercel Cron, authenticated with CRON_SECRET."""

from dataclasses import asdict
from typing import Annotated

import sentry_sdk
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.security import require_cron_secret
from app.db.session import get_session
from app.integrations.email.base import EmailProvider
from app.integrations.email.factory import get_email_provider
from app.integrations.kit.factory import get_kit_job
from app.jobs.drain_outbox import drain_outbox
from app.jobs.retention import run_retention
from app.services.kit_jobs import KitSubscribeJob

router = APIRouter(prefix="/cron", tags=["cron"], dependencies=[Depends(require_cron_secret)])
log = structlog.get_logger()


def email_provider(settings: Annotated[Settings, Depends(get_settings)]) -> EmailProvider:
    return get_email_provider(settings)


def kit_job(settings: Annotated[Settings, Depends(get_settings)]) -> KitSubscribeJob | None:
    return get_kit_job(settings)


@router.get("/drain-outbox")
async def drain(
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[EmailProvider, Depends(email_provider)],
    kit: Annotated[KitSubscribeJob | None, Depends(kit_job)],
) -> dict[str, int]:
    result = await drain_outbox(session, provider, kit=kit)
    counts = {"sent": result.sent, "retried": result.retried, "failed": result.failed}
    log.info("outbox_drained", **counts)
    if result.failed:
        # The outbox swallows delivery errors, so Sentry would never hear of a message that has run
        # out of retries. The text is fixed: no address and no count, so these group into one issue.
        log.error("outbox_messages_failed", failed=result.failed)
        sentry_sdk.capture_message("Outbox messages failed for good", level="error")
    return counts


@router.get("/retention")
async def retention(session: Annotated[AsyncSession, Depends(get_session)]) -> dict[str, int]:
    """Delete data past its retention period (docs/privacy.md). Logs counts, never rows."""
    counts = asdict(await run_retention(session))
    log.info("retention_run", **counts)
    return counts
