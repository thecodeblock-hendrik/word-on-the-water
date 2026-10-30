from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

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
