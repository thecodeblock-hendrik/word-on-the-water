"""Deletes data that has outlived its retention period, as listed in docs/privacy.md.

Runs daily from Vercel Cron. All the deletions happen in one transaction: a failed run changes
nothing and the next day's run does it all. Counts are returned for the log, never the rows.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from sqlalchemy import CursorResult, Delete, and_, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, ContactMessage, EmailOutbox, PrayerRequest, Subscriber
from app.models.email_outbox import OutboxStatus
from app.models.subscriber import SubscriberStatus

UNCONFIRMED_AFTER = timedelta(days=7)
AUDIT_LOG_AFTER = timedelta(days=365)
# The outbox keeps the recipient's address, so it ages out too. A sent message has had its body
# cleared; a failed one is kept longer so that someone can look at why it failed.
SENT_OUTBOX_AFTER = timedelta(days=7)
FAILED_OUTBOX_AFTER = timedelta(days=30)


@dataclass
class RetentionResult:
    subscribers: int = 0
    outbox: int = 0
    prayer_requests: int = 0
    contact_messages: int = 0
    audit_log: int = 0


async def _delete(session: AsyncSession, statement: Delete) -> int:
    result = cast("CursorResult[Any]", await session.execute(statement))
    return result.rowcount


async def run_retention(session: AsyncSession, now: datetime | None = None) -> RetentionResult:
    """Delete what is past its limit. Active, unsubscribed and bounced subscribers are kept."""
    now = now or datetime.now(UTC)
    result = RetentionResult(
        # Kit keeps its own unconfirmed subscribers: its API cannot delete one, and unsubscribing
        # would block a later honest sign-up. That cleanup is a dashboard task (privacy.md).
        subscribers=await _delete(
            session,
            delete(Subscriber).where(
                Subscriber.status == SubscriberStatus.PENDING,
                Subscriber.created_at < now - UNCONFIRMED_AFTER,
            ),
        ),
        outbox=await _delete(
            session,
            delete(EmailOutbox).where(
                or_(
                    and_(
                        EmailOutbox.status == OutboxStatus.SENT,
                        EmailOutbox.created_at < now - SENT_OUTBOX_AFTER,
                    ),
                    and_(
                        EmailOutbox.status == OutboxStatus.FAILED,
                        EmailOutbox.created_at < now - FAILED_OUTBOX_AFTER,
                    ),
                )
            ),
        ),
        prayer_requests=await _delete(
            session, delete(PrayerRequest).where(PrayerRequest.delete_after <= now)
        ),
        contact_messages=await _delete(
            session, delete(ContactMessage).where(ContactMessage.delete_after <= now)
        ),
        audit_log=await _delete(
            session, delete(AuditLog).where(AuditLog.created_at < now - AUDIT_LOG_AFTER)
        ),
    )
    await session.commit()
    return result
