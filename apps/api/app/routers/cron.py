"""Endpoints called by Vercel Cron, authenticated with CRON_SECRET."""

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.security import require_cron_secret
from app.db.session import get_session
from app.integrations.email.base import EmailProvider
from app.integrations.email.factory import get_email_provider
from app.jobs.drain_outbox import drain_outbox

router = APIRouter(prefix="/cron", tags=["cron"], dependencies=[Depends(require_cron_secret)])
log = structlog.get_logger()


def email_provider(settings: Annotated[Settings, Depends(get_settings)]) -> EmailProvider:
    return get_email_provider(settings)


@router.get("/drain-outbox")
async def drain(
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[EmailProvider, Depends(email_provider)],
) -> dict[str, int]:
    result = await drain_outbox(session, provider)
    counts = {"sent": result.sent, "retried": result.retried, "failed": result.failed}
    log.info("outbox_drained", **counts)
    return counts
