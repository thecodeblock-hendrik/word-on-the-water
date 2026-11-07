"""Keeping our subscriber mirror in step with Kit. If the two disagree, Kit wins."""

from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Subscriber
from app.models.subscriber import SubscriberStatus
from app.schemas.kit_webhook import KitEvent

# A spam complaint is the person leaving, so it counts as an unsubscribe.
STATUS_BY_EVENT = {
    "subscriber.activated": SubscriberStatus.ACTIVE,
    "subscriber.unsubscribed": SubscriberStatus.UNSUBSCRIBED,
    "subscriber.complained": SubscriberStatus.UNSUBSCRIBED,
    "subscriber.bounced": SubscriberStatus.BOUNCED,
}


async def apply_kit_event(session: AsyncSession, event: KitEvent, now: datetime) -> bool:
    """Update the mirror row for one event and commit. True if a subscriber was changed.

    Events we do not act on, and people we have no record of (they joined Kit another way), are
    left alone. The row is found by Kit's id, or by email if we have not stored the id yet.
    """
    status = STATUS_BY_EVENT.get(event.type)
    subscriber = event.data.subscriber
    if status is None or subscriber is None:
        return False
    row = await session.scalar(
        select(Subscriber).where(
            or_(
                Subscriber.kit_subscriber_id == subscriber.id,
                Subscriber.email == subscriber.email_address,
            )
        )
    )
    if row is None:
        return False
    row.kit_subscriber_id = subscriber.id
    row.status = status
    if status is SubscriberStatus.ACTIVE:
        row.confirmed_at = row.confirmed_at or now
        row.unsubscribed_at = None
    elif status is SubscriberStatus.UNSUBSCRIBED:
        row.unsubscribed_at = now
    await session.commit()
    return True
