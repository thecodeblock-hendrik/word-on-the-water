"""Retention (docs/privacy.md): every rule deletes what is past its limit and nothing else.

Rows are placed at a known age before a fixed "now", with one just inside and one just outside
each limit, so the boundaries are proven. Needs `make up` and `make migrate`.
"""

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs.retention import RetentionResult, run_retention
from app.models import AuditLog, ContactMessage, EmailOutbox, PrayerRequest, Subscriber
from app.models.email_outbox import OutboxStatus
from app.models.subscriber import SubscriberStatus

NOW = datetime(2026, 12, 1, 12, 0, tzinfo=UTC)


def ago(**period: int) -> datetime:
    return NOW - timedelta(**period)


def later(**period: int) -> datetime:
    return NOW + timedelta(**period)


@pytest.fixture
async def db(session: AsyncSession) -> AsyncIterator[AsyncSession]:
    """The shared session (clean outbox and subscribers), also clean of the other three tables."""
    for model in (PrayerRequest, ContactMessage, AuditLog):
        await session.execute(delete(model))
    await session.commit()
    yield session
    await session.rollback()
    for model in (PrayerRequest, ContactMessage, AuditLog):
        await session.execute(delete(model))
    await session.commit()


async def count(db: AsyncSession, model: type) -> int:
    return await db.scalar(select(func.count()).select_from(model)) or 0


def subscriber(name: str, status: SubscriberStatus, age: timedelta) -> Subscriber:
    return Subscriber(
        email=f"{name}@example.com",
        status=status,
        consent_text_version="v1",
        consent_at=NOW - age,
        source="landing_hero",
        created_at=NOW - age,
    )


def outbox(status: OutboxStatus, age: timedelta) -> EmailOutbox:
    return EmailOutbox(
        template="kit_subscribe",
        to_address="reader@example.com",
        status=status,
        created_at=NOW - age,
        next_attempt_at=NOW - age,
    )


def prayer(delete_after: datetime) -> PrayerRequest:
    return PrayerRequest(body_ciphertext=b"sealed", key_id="k1", delete_after=delete_after)


def contact(delete_after: datetime) -> ContactMessage:
    return ContactMessage(
        name="A", email="a@example.com", subject="Hi", body="Hello", delete_after=delete_after
    )


async def test_nothing_to_delete_is_a_clean_run(db: AsyncSession) -> None:
    assert await run_retention(db, now=NOW) == RetentionResult()


class TestUnconfirmedSubscribers:
    async def test_pending_for_over_7_days_are_deleted_and_younger_ones_stay(
        self, db: AsyncSession
    ) -> None:
        db.add_all(
            [
                subscriber("old", SubscriberStatus.PENDING, timedelta(days=7, minutes=1)),
                subscriber("fresh", SubscriberStatus.PENDING, timedelta(days=6, hours=23)),
            ]
        )
        await db.commit()

        result = await run_retention(db, now=NOW)

        assert result.subscribers == 1
        left = (await db.scalars(select(Subscriber.email))).all()
        assert left == ["fresh@example.com"]

    async def test_confirmed_unsubscribed_and_bounced_rows_are_never_touched(
        self, db: AsyncSession
    ) -> None:
        for status in (
            SubscriberStatus.ACTIVE,
            SubscriberStatus.UNSUBSCRIBED,
            SubscriberStatus.BOUNCED,
        ):
            db.add(subscriber(status.value, status, timedelta(days=900)))
        await db.commit()

        result = await run_retention(db, now=NOW)

        assert result.subscribers == 0
        assert await count(db, Subscriber) == 3


class TestPrayerRequestsAndContactMessages:
    async def test_rows_past_delete_after_go_and_the_rest_stay(self, db: AsyncSession) -> None:
        db.add_all([prayer(ago(seconds=1)), prayer(NOW), prayer(later(days=1))])
        db.add_all([contact(ago(days=30)), contact(NOW), contact(later(days=200))])
        await db.commit()

        result = await run_retention(db, now=NOW)

        assert (result.prayer_requests, result.contact_messages) == (2, 2)
        assert await count(db, PrayerRequest) == 1
        assert await count(db, ContactMessage) == 1

    async def test_a_prayer_request_waits_for_its_own_date_not_a_fixed_age(
        self, db: AsyncSession
    ) -> None:
        old_but_not_due = prayer(later(days=30))
        old_but_not_due.created_at = ago(days=200)
        db.add(old_but_not_due)
        await db.commit()

        assert (await run_retention(db, now=NOW)).prayer_requests == 0


class TestAuditLog:
    async def test_entries_older_than_a_year_go(self, db: AsyncSession) -> None:
        db.add_all(
            [
                AuditLog(action="view", entity_type="prayer", created_at=ago(days=366)),
                AuditLog(action="view", entity_type="prayer", created_at=ago(days=364)),
            ]
        )
        await db.commit()

        result = await run_retention(db, now=NOW)

        assert result.audit_log == 1
        assert await count(db, AuditLog) == 1


class TestEmailOutbox:
    """The outbox keeps the recipient's address, so it must age out like the data it came from."""

    async def test_sent_rows_go_after_7_days_and_failed_rows_after_30(
        self, db: AsyncSession
    ) -> None:
        db.add_all(
            [
                outbox(OutboxStatus.SENT, timedelta(days=8)),
                outbox(OutboxStatus.SENT, timedelta(days=6)),
                outbox(OutboxStatus.FAILED, timedelta(days=31)),
                outbox(OutboxStatus.FAILED, timedelta(days=29)),
            ]
        )
        await db.commit()

        result = await run_retention(db, now=NOW)

        assert result.outbox == 2
        assert await count(db, EmailOutbox) == 2

    async def test_a_pending_message_is_never_deleted_however_old(self, db: AsyncSession) -> None:
        db.add(outbox(OutboxStatus.PENDING, timedelta(days=400)))
        await db.commit()

        assert (await run_retention(db, now=NOW)).outbox == 0
        assert await count(db, EmailOutbox) == 1


async def test_a_second_run_finds_nothing_more(db: AsyncSession) -> None:
    db.add_all(
        [
            subscriber("old", SubscriberStatus.PENDING, timedelta(days=9)),
            prayer(ago(days=1)),
            contact(ago(days=1)),
            AuditLog(action="view", entity_type="prayer", created_at=ago(days=400)),
            outbox(OutboxStatus.SENT, timedelta(days=9)),
        ]
    )
    await db.commit()

    first = await run_retention(db, now=NOW)
    second = await run_retention(db, now=NOW)

    assert first == RetentionResult(
        subscribers=1, outbox=1, prayer_requests=1, contact_messages=1, audit_log=1
    )
    assert second == RetentionResult()


async def test_it_uses_the_real_clock_when_not_given_one(db: AsyncSession) -> None:
    now = datetime.now(UTC)
    db.add_all(
        [
            Subscriber(
                email="stale@example.com",
                status=SubscriberStatus.PENDING,
                consent_text_version="v1",
                consent_at=now - timedelta(days=10),
                source="landing_hero",
                created_at=now - timedelta(days=10),
            ),
            prayer(now - timedelta(minutes=1)),
        ]
    )
    await db.commit()

    result = await run_retention(db)

    assert (result.subscribers, result.prayer_requests) == (1, 1)
