from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Subscriber
from app.models.subscriber import SubscriberStatus
from app.schemas.kit_webhook import KitEvent
from app.services.kit_events import apply_kit_event

NOW = datetime(2026, 12, 1, 12, 0, tzinfo=UTC)
EMAIL = "reader@example.com"


def event(type_: str, kit_id: int = 4242, email: str = EMAIL) -> KitEvent:
    return KitEvent.model_validate(
        {
            "id": f"evt-{type_}-{kit_id}",
            "type": type_,
            "data": {"subscriber": {"id": kit_id, "email_address": email, "state": "x"}},
        }
    )


async def add(
    session: AsyncSession,
    status: SubscriberStatus = SubscriberStatus.PENDING,
    kit_id: int | None = None,
    email: str = EMAIL,
) -> None:
    session.add(
        Subscriber(
            email=email,
            status=status,
            kit_subscriber_id=kit_id,
            consent_text_version="v1",
            consent_at=datetime(2026, 1, 1, tzinfo=UTC),
            source="landing_hero",
        )
    )
    await session.commit()


async def only(session: AsyncSession) -> Subscriber:
    session.expire_all()
    row = await session.scalar(select(Subscriber))
    assert row is not None
    found: Subscriber = row
    return found


async def test_confirming_makes_a_pending_subscriber_active_and_records_when(
    session: AsyncSession,
) -> None:
    await add(session)

    assert await apply_kit_event(session, event("subscriber.activated"), NOW) is True

    row = await only(session)
    assert (row.status, row.confirmed_at, row.kit_subscriber_id) == (
        SubscriberStatus.ACTIVE,
        NOW,
        4242,
    )


async def test_confirming_again_keeps_the_first_confirmation_time(session: AsyncSession) -> None:
    await add(session)
    await apply_kit_event(session, event("subscriber.activated"), NOW)

    await apply_kit_event(session, event("subscriber.activated"), datetime(2027, 1, 1, tzinfo=UTC))

    assert (await only(session)).confirmed_at == NOW


@pytest.mark.parametrize(
    ("type_", "status"),
    [
        ("subscriber.unsubscribed", SubscriberStatus.UNSUBSCRIBED),
        ("subscriber.complained", SubscriberStatus.UNSUBSCRIBED),
        ("subscriber.bounced", SubscriberStatus.BOUNCED),
    ],
)
async def test_leaving_events_set_the_status(
    session: AsyncSession, type_: str, status: SubscriberStatus
) -> None:
    await add(session, SubscriberStatus.ACTIVE, kit_id=4242)

    assert await apply_kit_event(session, event(type_), NOW) is True

    row = await only(session)
    assert row.status is status
    assert row.unsubscribed_at == (NOW if status is SubscriberStatus.UNSUBSCRIBED else None)


async def test_kit_wins_when_an_unsubscribed_person_is_activated_again(
    session: AsyncSession,
) -> None:
    await add(session, SubscriberStatus.UNSUBSCRIBED, kit_id=4242)
    row = await only(session)
    row.unsubscribed_at = datetime(2026, 6, 1, tzinfo=UTC)
    await session.commit()

    await apply_kit_event(session, event("subscriber.activated"), NOW)

    row = await only(session)
    assert (row.status, row.unsubscribed_at) == (SubscriberStatus.ACTIVE, None)


async def test_the_subscriber_is_found_by_kit_id_even_if_the_email_changed(
    session: AsyncSession,
) -> None:
    await add(session, SubscriberStatus.ACTIVE, kit_id=4242)

    assert await apply_kit_event(
        session, event("subscriber.unsubscribed", email="new@example.com"), NOW
    )

    assert (await only(session)).status is SubscriberStatus.UNSUBSCRIBED


async def test_the_email_is_matched_without_regard_to_case(session: AsyncSession) -> None:
    await add(session)

    assert await apply_kit_event(
        session, event("subscriber.activated", email="READER@Example.com"), NOW
    )


async def test_someone_we_have_no_record_of_is_left_alone(session: AsyncSession) -> None:
    assert await apply_kit_event(session, event("subscriber.activated"), NOW) is False
    assert list(await session.scalars(select(Subscriber))) == []


@pytest.mark.parametrize("type_", ["subscriber.created", "subscriber.tag_added", "tag.created"])
async def test_events_we_do_not_act_on_change_nothing(session: AsyncSession, type_: str) -> None:
    await add(session)

    assert await apply_kit_event(session, event(type_), NOW) is False

    assert (await only(session)).status is SubscriberStatus.PENDING


async def test_an_event_with_no_subscriber_is_ignored(session: AsyncSession) -> None:
    bare = KitEvent.model_validate({"id": "e1", "type": "subscriber.activated", "data": {}})
    assert await apply_kit_event(session, bare, NOW) is False
