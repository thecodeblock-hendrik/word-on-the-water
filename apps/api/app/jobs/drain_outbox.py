"""Sends pending outbox emails. Delivery is at-least-once, retried with backoff."""

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


@dataclass
class DrainResult:
    sent: int = 0
    retried: int = 0
    failed: int = 0


def _error_text(exc: Exception) -> str:
    """Only provider errors carry a safe message; anything else logs just its type."""
    return str(exc) if isinstance(exc, EmailSendError) else type(exc).__name__


async def drain_outbox(
    session: AsyncSession, provider: EmailProvider, now: datetime | None = None
) -> DrainResult:
    now = now or datetime.now(UTC)
    result = DrainResult()
    due = select(EmailOutbox).where(
        EmailOutbox.status == OutboxStatus.PENDING, EmailOutbox.next_attempt_at <= now
    )
    rows = await session.scalars(
        due.order_by(EmailOutbox.next_attempt_at)
        .limit(BATCH_SIZE)
        .with_for_update(skip_locked=True)
    )
    for row in rows:
        row.attempts += 1
        try:
            await provider.send(render(row.template, row.to_address, row.payload))
        except Exception as exc:  # noqa: BLE001  one bad message must not block the batch
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
    await session.commit()
    return result
