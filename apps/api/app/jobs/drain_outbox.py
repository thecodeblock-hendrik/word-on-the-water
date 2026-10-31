"""Sends pending outbox emails. Delivery is at-least-once, retried with backoff."""

import asyncio
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.email.base import EmailProvider, EmailSendError
from app.models import EmailOutbox
from app.models.email_outbox import OutboxStatus
from app.services.email_templates import render

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
    return str(exc) if isinstance(exc, EmailSendError) else type(exc).__name__


async def drain_outbox(
    session: AsyncSession,
    provider: EmailProvider,
    now: datetime | None = None,
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
        row = await session.scalar(
            select(EmailOutbox)
            .where(EmailOutbox.status == OutboxStatus.PENDING, EmailOutbox.next_attempt_at <= now)
            .order_by(EmailOutbox.next_attempt_at)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if row is None:
            break
        await _deliver(row, provider, now, result, send_timeout)
        await session.commit()
    return result


async def _deliver(
    row: EmailOutbox,
    provider: EmailProvider,
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
