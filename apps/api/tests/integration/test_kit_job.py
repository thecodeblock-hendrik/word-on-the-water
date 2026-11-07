from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlsplit

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.email.base import EmailMessage
from app.integrations.kit.client import KitError, KitRateLimitedError
from app.jobs.drain_outbox import MAX_ATTEMPTS, drain_outbox
from app.models import EmailOutbox, Subscriber
from app.models.email_outbox import OutboxStatus
from app.services.kit_jobs import KIT_SUBSCRIBE, KitSubscribeJob
from app.services.outbox import enqueue

ADDRESS = "reader@example.com"
PAYLOAD = {"first_name": "Ann", "source": "landing_hero", "consent_text_version": "v1"}


class FakeKitClient:
    def __init__(self, error: Exception | None = None) -> None:
        self.calls: list[tuple[str, str | None, str]] = []
        self.error = error

    async def subscribe(self, email: str, first_name: str | None, referrer: str) -> int:
        if self.error:
            raise self.error
        self.calls.append((email, first_name, referrer))
        return 4242


class FakeProvider:
    def __init__(self) -> None:
        self.sent: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> None:
        self.sent.append(message)


def job(client: FakeKitClient) -> KitSubscribeJob:
    return KitSubscribeJob(client, "https://wordonthewater.net")  # type: ignore[arg-type]


async def queue(session: AsyncSession) -> None:
    session.add(
        Subscriber(
            email=ADDRESS,
            consent_text_version="v1",
            consent_at=datetime(2026, 1, 1, tzinfo=UTC),
            source="landing_hero",
        )
    )
    await enqueue(session, KIT_SUBSCRIBE, ADDRESS, PAYLOAD)
    await session.commit()


async def rows(session: AsyncSession) -> list[EmailOutbox]:
    return list(await session.scalars(select(EmailOutbox)))


async def test_a_kit_job_goes_to_kit_not_to_the_email_provider(session: AsyncSession) -> None:
    await queue(session)
    kit, provider = FakeKitClient(), FakeProvider()

    result = await drain_outbox(session, provider, kit=job(kit))

    assert (result.sent, result.retried, result.failed) == (1, 0, 0)
    assert provider.sent == []
    assert [(c[0], c[1]) for c in kit.calls] == [(ADDRESS, "Ann")]


async def test_the_referrer_carries_the_source_and_the_consent_version(
    session: AsyncSession,
) -> None:
    await queue(session)
    kit = FakeKitClient()

    await drain_outbox(session, FakeProvider(), kit=job(kit))

    referrer = urlsplit(kit.calls[0][2])
    assert f"{referrer.scheme}://{referrer.netloc}" == "https://wordonthewater.net"
    assert parse_qs(referrer.query) == {"source": ["landing_hero"], "consent": ["v1"]}


async def test_the_kit_id_is_kept_and_the_first_name_is_wiped_from_the_outbox(
    session: AsyncSession,
) -> None:
    await queue(session)

    await drain_outbox(session, FakeProvider(), kit=job(FakeKitClient()))

    subscriber = await session.scalar(select(Subscriber))
    assert subscriber is not None and subscriber.kit_subscriber_id == 4242
    [row] = await rows(session)
    assert (row.status, row.payload) == (OutboxStatus.SENT, {})


async def test_a_kit_failure_is_retried_with_backoff_and_a_safe_message(
    session: AsyncSession,
) -> None:
    await queue(session)
    now = datetime.now(UTC)

    result = await drain_outbox(
        session,
        FakeProvider(),
        kit=job(FakeKitClient(KitError("Kit rejected status 500"))),
        now=now,
    )

    assert (result.sent, result.retried, result.failed) == (0, 1, 0)
    [row] = await rows(session)
    assert row.status is OutboxStatus.PENDING
    assert row.next_attempt_at == now + timedelta(minutes=5)
    assert row.last_error == "Kit rejected status 500"
    assert ADDRESS not in (row.last_error or "")
    assert row.payload == PAYLOAD


async def test_kit_rate_limiting_is_retried_like_any_failure(session: AsyncSession) -> None:
    await queue(session)

    result = await drain_outbox(
        session, FakeProvider(), kit=job(FakeKitClient(KitRateLimitedError("429")))
    )

    assert (result.retried, result.failed) == (1, 0)


async def test_a_kit_job_gives_up_after_the_maximum_attempts(session: AsyncSession) -> None:
    await queue(session)
    [row] = await rows(session)
    row.attempts = MAX_ATTEMPTS - 1
    await session.commit()

    result = await drain_outbox(session, FakeProvider(), kit=job(FakeKitClient(KitError("down"))))

    assert (result.retried, result.failed) == (0, 1)


async def test_without_kit_configured_the_job_waits_and_says_why(session: AsyncSession) -> None:
    await queue(session)

    result = await drain_outbox(session, FakeProvider(), kit=None)

    assert (result.sent, result.retried) == (0, 1)
    [row] = await rows(session)
    assert row.last_error == "Kit is not configured"


async def test_a_sign_up_for_a_deleted_subscriber_is_still_sent(session: AsyncSession) -> None:
    await enqueue(session, KIT_SUBSCRIBE, ADDRESS, PAYLOAD)
    await session.commit()

    result = await drain_outbox(session, FakeProvider(), kit=job(FakeKitClient()))

    assert result.sent == 1


async def test_emails_and_kit_jobs_are_drained_together(session: AsyncSession) -> None:
    await queue(session)
    await enqueue(
        session,
        "subscribe_confirmation",
        "other@example.com",
        {"first_name": "Sam", "confirm_url": "https://example.com/c"},
    )
    await session.commit()
    kit, provider = FakeKitClient(), FakeProvider()

    result = await drain_outbox(session, provider, kit=job(kit))

    assert result.sent == 2
    assert len(kit.calls) == 1 and len(provider.sent) == 1
