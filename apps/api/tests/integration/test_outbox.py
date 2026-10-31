from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.email.base import EmailMessage, EmailSendError
from app.jobs.drain_outbox import MAX_ATTEMPTS, drain_outbox
from app.models import EmailOutbox
from app.models.email_outbox import OutboxStatus
from app.services.outbox import enqueue

PAYLOAD = {"first_name": "Sam", "confirm_url": "https://example.com/c?token=secret-token"}
ADDRESS = "reader@example.com"


class FakeProvider:
    def __init__(self, error: Exception | None = None) -> None:
        self.sent: list[EmailMessage] = []
        self.error = error

    async def send(self, message: EmailMessage) -> None:
        if self.error:
            raise self.error
        self.sent.append(message)


async def _rows(session: AsyncSession) -> list[EmailOutbox]:
    return list((await session.scalars(select(EmailOutbox))).all())


async def test_enqueue_is_part_of_the_callers_transaction(session: AsyncSession) -> None:
    await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    await session.rollback()
    assert await _rows(session) == []


async def test_drain_sends_due_message_and_clears_payload(session: AsyncSession) -> None:
    await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    await session.commit()
    provider = FakeProvider()

    result = await drain_outbox(session, provider)

    assert (result.sent, result.retried, result.failed) == (1, 0, 0)
    assert provider.sent[0].to == ADDRESS
    assert PAYLOAD["confirm_url"] in provider.sent[0].text
    [row] = await _rows(session)
    assert row.status is OutboxStatus.SENT
    assert row.attempts == 1
    assert row.payload == {}


async def test_drain_skips_messages_not_yet_due(session: AsyncSession) -> None:
    row = await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    row.next_attempt_at = datetime.now(UTC) + timedelta(hours=1)
    await session.commit()
    provider = FakeProvider()

    result = await drain_outbox(session, provider)

    assert result.sent == 0
    assert provider.sent == []


async def test_sent_message_is_not_sent_twice(session: AsyncSession) -> None:
    await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    await session.commit()
    provider = FakeProvider()
    await drain_outbox(session, provider)
    await drain_outbox(session, provider)
    assert len(provider.sent) == 1


async def test_failure_is_retried_with_backoff_and_no_leak(session: AsyncSession) -> None:
    await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    await session.commit()
    now = datetime.now(UTC)

    result = await drain_outbox(session, FakeProvider(EmailSendError("status 500")), now=now)

    assert (result.sent, result.retried, result.failed) == (0, 1, 0)
    [row] = await _rows(session)
    assert row.status is OutboxStatus.PENDING
    assert row.attempts == 1
    assert row.next_attempt_at == now + timedelta(minutes=5)
    assert row.last_error == "status 500"
    assert ADDRESS not in (row.last_error or "")
    assert row.payload == PAYLOAD


async def test_marked_failed_after_max_attempts(session: AsyncSession) -> None:
    row = await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    row.attempts = MAX_ATTEMPTS - 1
    await session.commit()

    result = await drain_outbox(session, FakeProvider(EmailSendError("down")))

    assert (result.retried, result.failed) == (0, 1)
    assert (await _rows(session))[0].status is OutboxStatus.FAILED


async def test_bad_template_does_not_block_other_messages(session: AsyncSession) -> None:
    await enqueue(session, "no_such_template", ADDRESS, {})
    await enqueue(session, "subscribe_confirmation", "other@example.com", PAYLOAD)
    await session.commit()
    provider = FakeProvider()

    result = await drain_outbox(session, provider)

    assert (result.sent, result.retried) == (1, 1)
    assert [m.to for m in provider.sent] == ["other@example.com"]


class Interrupted(BaseException):
    """Stands in for the function being killed mid-drain (not caught by `except Exception`)."""


class ScriptedProvider:
    """Succeeds by default; raises the scripted error for given addresses; can advance a clock."""

    def __init__(self, errors: dict[str, BaseException] | None = None) -> None:
        self.errors = errors or {}
        self.sent: list[str] = []
        self.clock = [0.0]
        self.seconds_per_send = 0.0

    async def send(self, message: EmailMessage) -> None:
        self.clock[0] += self.seconds_per_send
        if error := self.errors.get(message.to):
            raise error
        self.sent.append(message.to)


async def _enqueue_many(session: AsyncSession, count: int) -> list[str]:
    """Enqueue messages m1..mN, due in that order."""
    start = datetime.now(UTC) - timedelta(hours=1)
    addresses = [f"m{i}@example.com" for i in range(1, count + 1)]
    for i, address in enumerate(addresses):
        row = await enqueue(session, "subscribe_confirmation", address, PAYLOAD)
        row.next_attempt_at = start + timedelta(seconds=i)
    await session.commit()
    return addresses


async def _by_address(session: AsyncSession) -> dict[str, EmailOutbox]:
    return {row.to_address: row for row in await _rows(session)}


async def test_sent_messages_survive_an_interrupted_drain(session: AsyncSession) -> None:
    addresses = await _enqueue_many(session, 4)
    provider = ScriptedProvider({addresses[2]: Interrupted()})

    with pytest.raises(Interrupted):
        await drain_outbox(session, provider)
    await session.rollback()

    rows = await _by_address(session)
    assert [rows[a].status for a in addresses[:2]] == [OutboxStatus.SENT] * 2
    again = ScriptedProvider()
    await drain_outbox(session, again)
    assert again.sent == addresses[2:]


async def test_attempts_are_saved_before_an_interruption(session: AsyncSession) -> None:
    addresses = await _enqueue_many(session, 2)
    provider = ScriptedProvider({addresses[0]: EmailSendError("down"), addresses[1]: Interrupted()})

    with pytest.raises(Interrupted):
        await drain_outbox(session, provider)
    await session.rollback()

    first = (await _by_address(session))[addresses[0]]
    assert first.attempts == 1
    assert first.last_error == "down"


async def test_drain_stops_starting_sends_after_its_time_budget(session: AsyncSession) -> None:
    addresses = await _enqueue_many(session, 5)
    provider = ScriptedProvider()
    provider.seconds_per_send = 10

    result = await drain_outbox(session, provider, budget=25, clock=lambda: provider.clock[0])

    assert result.sent == 3
    rows = await _by_address(session)
    assert [rows[a].status for a in addresses[3:]] == [OutboxStatus.PENDING] * 2
