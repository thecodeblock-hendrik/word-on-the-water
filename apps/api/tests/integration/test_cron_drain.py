import pytest
import sentry_sdk
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.testing import capture_logs

from app.integrations.email.base import EmailMessage, EmailSendError
from app.jobs.drain_outbox import MAX_ATTEMPTS
from app.main import create_app
from app.routers.cron import email_provider
from app.services.outbox import enqueue
from tests.integration.test_outbox import ADDRESS, PAYLOAD, FakeProvider


async def test_cron_drains_outbox_with_cron_secret(session: AsyncSession) -> None:
    await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    await session.commit()
    provider = FakeProvider()
    app = create_app()
    app.dependency_overrides[email_provider] = lambda: provider

    response = TestClient(app).get(
        "/cron/drain-outbox", headers={"Authorization": "Bearer test-cron-secret"}
    )

    assert response.status_code == 200
    assert response.json() == {"sent": 1, "retried": 0, "failed": 0}
    assert isinstance(provider.sent[0], EmailMessage)


async def test_cron_drain_logs_counts_without_addresses(session: AsyncSession) -> None:
    await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    await session.commit()
    app = create_app()
    app.dependency_overrides[email_provider] = lambda: FakeProvider()

    with capture_logs() as logs:
        TestClient(app).get(
            "/cron/drain-outbox", headers={"Authorization": "Bearer test-cron-secret"}
        )

    entry = next(entry for entry in logs if entry["event"] == "outbox_drained")
    assert (entry["sent"], entry["retried"], entry["failed"]) == (1, 0, 0)
    assert ADDRESS not in str(logs)


HEADERS = {"Authorization": "Bearer test-cron-secret"}


@pytest.fixture
def sentry_messages(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str]]:
    """What the cron endpoint sends to Sentry as (message, level)."""
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        sentry_sdk, "capture_message", lambda message, level=None: sent.append((message, level))
    )
    return sent


async def test_a_message_that_fails_for_good_is_logged_and_sent_to_sentry(
    session: AsyncSession, sentry_messages: list[tuple[str, str]]
) -> None:
    row = await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    row.attempts = MAX_ATTEMPTS - 1  # this is the last try
    await session.commit()
    app = create_app()
    app.dependency_overrides[email_provider] = lambda: FakeProvider(EmailSendError("boom"))

    with capture_logs() as logs:
        response = TestClient(app).get("/cron/drain-outbox", headers=HEADERS)

    assert response.json() == {"sent": 0, "retried": 0, "failed": 1}
    entry = next((e for e in logs if e["event"] == "outbox_messages_failed"), None)
    assert entry is not None and entry["failed"] == 1 and entry["log_level"] == "error", logs
    assert sentry_messages == [("Outbox messages failed for good", "error")]
    assert ADDRESS not in str(logs) and ADDRESS not in str(sentry_messages)


async def test_a_message_that_will_be_retried_is_not_an_alert(
    session: AsyncSession, sentry_messages: list[tuple[str, str]]
) -> None:
    await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    await session.commit()
    app = create_app()
    app.dependency_overrides[email_provider] = lambda: FakeProvider(EmailSendError("boom"))

    response = TestClient(app).get("/cron/drain-outbox", headers=HEADERS)

    assert response.json() == {"sent": 0, "retried": 1, "failed": 0}
    assert sentry_messages == []


async def test_a_clean_run_sends_nothing_to_sentry(
    session: AsyncSession, sentry_messages: list[tuple[str, str]]
) -> None:
    await enqueue(session, "subscribe_confirmation", ADDRESS, PAYLOAD)
    await session.commit()
    app = create_app()
    app.dependency_overrides[email_provider] = lambda: FakeProvider()

    TestClient(app).get("/cron/drain-outbox", headers=HEADERS)

    assert sentry_messages == []
