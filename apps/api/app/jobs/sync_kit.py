"""Keeps the subscriber mirror in step with Kit by reading Kit's list once a day.

Kit's webhooks need a paid plan, so this stands in for them (docs/adr/0008). It runs before the
retention job, which deletes pending rows: someone who confirmed in Kit is marked active here
first and so survives. Kit wins when the two disagree. Counts only are returned, never addresses.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Subscriber
from app.services.kit_events import STATUS_BY_KIT_STATE, set_status


class SubscriberSource(Protocol):
    async def list_subscribers(
        self, after: str | None = None
    ) -> tuple[list[tuple[int, str, str]], str | None]: ...


@dataclass
class SyncResult:
    checked: int = 0
    updated: int = 0


async def sync_kit(
    session: AsyncSession, kit: SubscriberSource, now: datetime | None = None
) -> SyncResult:
    """Read every page of Kit's subscribers and update the rows we already have."""
    now = now or datetime.now(UTC)
    result = SyncResult()
    cursor = None
    while True:
        people, cursor = await kit.list_subscribers(cursor)
        result.checked += len(people)
        result.updated += await _apply_page(session, people, now)
        if cursor is None:
            break
    await session.commit()
    return result


async def _apply_page(
    session: AsyncSession, people: list[tuple[int, str, str]], now: datetime
) -> int:
    rows = await session.scalars(
        select(Subscriber).where(Subscriber.email.in_([email for _, email, _ in people]))
    )
    by_email = {row.email.lower(): row for row in rows}
    updated = 0
    for kit_id, email, state in people:
        status = STATUS_BY_KIT_STATE.get(state)
        row = by_email.get(email.lower())
        if status is not None and row is not None and set_status(row, status, kit_id, now):
            updated += 1
    return updated
