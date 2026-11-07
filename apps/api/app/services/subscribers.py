"""Sign-up logic: record the consent, then queue the Kit call. No HTTP in here."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Subscriber
from app.models.subscriber import SubscriberStatus
from app.schemas.subscribers import SubscribeRequest
from app.services.outbox import enqueue

KIT_SUBSCRIBE = "kit_subscribe"


async def request_subscription(session: AsyncSession, data: SubscribeRequest) -> UUID | None:
    """Store a new address as pending and queue the Kit sign-up.

    An address that is still pending is queued again (the confirmation email may have been lost;
    Kit accepts a repeat). Confirmed, unsubscribed and bounced addresses change nothing. The caller
    gives the same answer in every case, so the response never reveals which one it was. Returns
    the id of the queued Kit job, or None when nothing was queued.
    """
    inserted = await session.scalar(
        insert(Subscriber)
        .values(
            email=data.email,
            first_name=data.first_name,
            status=SubscriberStatus.PENDING,
            consent_text_version=data.consent_text_version,
            consent_at=datetime.now(UTC),
            source=data.source,
        )
        .on_conflict_do_nothing(index_elements=["email"])
        .returning(Subscriber.id)
    )
    if inserted is None:
        status = await session.scalar(
            select(Subscriber.status).where(Subscriber.email == data.email)
        )
        if status is not SubscriberStatus.PENDING:
            await session.commit()
            return None
    job = await enqueue(
        session,
        KIT_SUBSCRIBE,
        data.email,
        {
            "first_name": data.first_name,
            "source": data.source,
            "consent_text_version": data.consent_text_version,
        },
    )
    await session.commit()
    return job.id
