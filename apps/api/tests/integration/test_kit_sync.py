from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs.sync_kit import sync_kit
from app.models import Subscriber
from app.models.subscriber import SubscriberStatus

NOW = datetime(2026, 12, 1, 12, 0, tzinfo=UTC)
EARLIER = datetime(2026, 11, 29, tzinfo=UTC)

Person = tuple[int, str, str]


class FakeKit:
    """Serves Kit's subscribers in pages, like GET /v4/subscribers with a cursor."""

    def __init__(self, *pages: list[Person]) -> None:
        self.pages = pages
        self.cursors: list[str | None] = []

    async def list_subscribers(self, after: str | None = None) -> tuple[list[Person], str | None]:
        self.cursors.append(after)
        index = int(after) if after else 0
        more = str(index + 1) if index + 1 < len(self.pages) else None
        return self.pages[index], more


async def add(session: AsyncSession, email: str, status: SubscriberStatus) -> None:
    session.add(
        Subscriber(
            email=email,
            status=status,
            consent_text_version="v1",
            consent_at=EARLIER,
            source="landing_hero",
        )
    )
    await session.commit()


async def row(session: AsyncSession, email: str) -> Subscriber:
    found = await session.scalar(
        select(Subscriber)
        .where(Subscriber.email == email)
        .execution_options(populate_existing=True)
    )
    assert found is not None
    return found


async def test_a_confirmed_person_becomes_active_with_kits_id(session: AsyncSession) -> None:
    await add(session, "ann@example.com", SubscriberStatus.PENDING)

    result = await sync_kit(session, FakeKit([(11, "ann@example.com", "active")]), NOW)

    ann = await row(session, "ann@example.com")
    assert ann.status is SubscriberStatus.ACTIVE
    assert ann.kit_subscriber_id == 11
    assert ann.confirmed_at == NOW
    assert (result.checked, result.updated) == (1, 1)


async def test_leaving_and_bouncing_follow_kit(session: AsyncSession) -> None:
    for name in ("left", "spam", "bounce"):
        await add(session, f"{name}@example.com", SubscriberStatus.ACTIVE)

    await sync_kit(
        session,
        FakeKit(
            [
                (1, "left@example.com", "cancelled"),
                (2, "spam@example.com", "complained"),
                (3, "bounce@example.com", "bounced"),
            ]
        ),
        NOW,
    )

    left, spam, bounce = [
        await row(session, f"{n}@example.com") for n in ("left", "spam", "bounce")
    ]
    assert (left.status, spam.status, bounce.status) == (
        SubscriberStatus.UNSUBSCRIBED,
        SubscriberStatus.UNSUBSCRIBED,
        SubscriberStatus.BOUNCED,
    )
    assert left.unsubscribed_at == NOW


async def test_an_unconfirmed_person_stays_pending(session: AsyncSession) -> None:
    await add(session, "ann@example.com", SubscriberStatus.PENDING)

    result = await sync_kit(session, FakeKit([(11, "ann@example.com", "inactive")]), NOW)

    assert (await row(session, "ann@example.com")).status is SubscriberStatus.PENDING
    assert result.updated == 0


async def test_people_we_have_no_record_of_are_left_alone(session: AsyncSession) -> None:
    await sync_kit(session, FakeKit([(9, "stranger@example.com", "active")]), NOW)

    assert await session.scalar(select(func.count()).select_from(Subscriber)) == 0


async def test_every_page_is_read(session: AsyncSession) -> None:
    await add(session, "ann@example.com", SubscriberStatus.PENDING)
    await add(session, "bob@example.com", SubscriberStatus.PENDING)
    kit = FakeKit([(1, "ann@example.com", "active")], [(2, "bob@example.com", "active")])

    result = await sync_kit(session, kit, NOW)

    assert kit.cursors == [None, "1"]
    assert (await row(session, "bob@example.com")).status is SubscriberStatus.ACTIVE
    assert (result.checked, result.updated) == (2, 2)


async def test_a_second_run_changes_nothing_and_keeps_the_first_confirmation(
    session: AsyncSession,
) -> None:
    await add(session, "ann@example.com", SubscriberStatus.PENDING)
    kit = FakeKit([(11, "ann@example.com", "active")])
    await sync_kit(session, kit, EARLIER)

    result = await sync_kit(session, kit, NOW)

    assert result.updated == 0
    assert (await row(session, "ann@example.com")).confirmed_at == EARLIER
