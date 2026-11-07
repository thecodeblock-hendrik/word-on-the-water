"""Sends pending outbox emails. Delivery is at-least-once, retried with backoff."""

import asyncio
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.session import get_engine
from app.integrations.email.base import EmailProvider, EmailSendError
from app.integrations.kit.client import KitError
from app.models import EmailOutbox
from app.models.email_outbox import OutboxStatus
from app.services.email_templates import render
from app.services.kit_jobs import KIT_SUBSCRIBE, KitSubscribeJob

log = structlog.get_logger()
MAX_ATTEMPTS = 5
BASE_BACKOFF = timedelta(minutes=5)
BATCH_SIZE = 20
TIME_BUDGET_SECONDS = 20.0
SEND_TIMEOUT_SECONDS = 8.0


@dataclass
class DrainResult:
    sent: int = 0
    retried: int = 0
    failed: int = 0


def _error_text(exc: Exception) -> str:
    """Only provider errors carry a safe message; anything else logs just its type."""
    return str(exc) if isinstance(exc, EmailSendError | KitError) else type(exc).__name__


async def drain_outbox(
    session: AsyncSession,
    provider: EmailProvider,
    now: datetime | None = None,
    kit: KitSubscribeJob | None = None,
    only: UUID | None = None,
    budget: float = TIME_BUDGET_SECONDS,
    clock: Callable[[], float] = time.monotonic,
    send_timeout: float = SEND_TIMEOUT_SECONDS,
) -> DrainResult:
    """Send due messages one at a time, committing after each.

    A killed run keeps everything already done, and no new send starts once the time budget
    is used, so the run ends inside the function's maxDuration.
    """
    now = now or datetime.now(UTC)
    deadline = clock() + budget
    result = DrainResult()
    for _ in range(BATCH_SIZE):
        if clock() >= deadline:
            break
        query = select(EmailOutbox).where(
            EmailOutbox.status == OutboxStatus.PENDING, EmailOutbox.next_attempt_at <= now
        )
        if only is not None:
            query = query.where(EmailOutbox.id == only)
        row = await session.scalar(
            query.order_by(EmailOutbox.next_attempt_at).limit(1).with_for_update(skip_locked=True)
        )
        if row is None:
            break
        await _deliver(session, row, provider, kit, now, result, send_timeout)
        await session.commit()
    return result


async def _deliver(
    session: AsyncSession,
    row: EmailOutbox,
    provider: EmailProvider,
    kit: KitSubscribeJob | None,
    now: datetime,
    result: DrainResult,
    send_timeout: float,
) -> None:
    """Send one row and record the outcome on it; the caller commits.

    The send is cut off after send_timeout, so budget plus cap stays inside maxDuration and a
    slow provider cannot get the function killed between sending and committing.
    """
    row.attempts += 1
    try:
        async with asyncio.timeout(send_timeout):
            if row.template == KIT_SUBSCRIBE:
                if kit is None:
                    raise KitError("Kit is not configured")
                await kit.run(session, row)
            else:
                await provider.send(render(row.template, row.to_address, row.payload))
    except Exception as exc:  # noqa: BLE001  one bad message must not block the others
        row.last_error = _error_text(exc)
        if row.attempts >= MAX_ATTEMPTS:
            row.status = OutboxStatus.FAILED
            result.failed += 1
        else:
            row.next_attempt_at = now + BASE_BACKOFF * 2 ** (row.attempts - 1)
            result.retried += 1
    else:
        row.status = OutboxStatus.SENT
        row.last_error = None
        row.payload = {}
        result.sent += 1


async def attempt_now(row_id: UUID, provider: EmailProvider, kit: KitSubscribeJob) -> None:
    """Try one queued job right after the request, with its own session. Best effort.

    Run after the response is sent, so the visitor never waits for Kit and the answer's timing
    reveals nothing. If this does not finish, the row stays pending for the cron to retry.
    """
    try:
        async with async_sessionmaker(get_engine(), expire_on_commit=False)() as session:
            await drain_outbox(session, provider, kit=kit, only=row_id)
    except Exception as exc:  # noqa: BLE001  never raise into the response; the cron retries
        log.warning("immediate_send_failed", error=type(exc).__name__)
