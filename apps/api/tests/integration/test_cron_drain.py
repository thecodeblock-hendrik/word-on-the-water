from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.testing import capture_logs

from app.integrations.email.base import EmailMessage
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
