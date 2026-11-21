from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.testing import capture_logs

from app.main import create_app
from app.models import Subscriber
from app.models.subscriber import SubscriberStatus
from app.routers.cron import kit_source
from tests.integration.test_kit_sync import FakeKit

HEADERS = {"Authorization": "Bearer test-cron-secret"}
ADDRESS = "ann@example.com"


async def add_pending(session: AsyncSession) -> None:
    session.add(
        Subscriber(
            email=ADDRESS,
            status=SubscriberStatus.PENDING,
            consent_text_version="v1",
            consent_at=datetime(2026, 11, 29, tzinfo=UTC),
            source="landing_hero",
        )
    )
    await session.commit()


async def test_cron_syncs_kit_and_reports_counts(session: AsyncSession) -> None:
    await add_pending(session)
    app = create_app()
    app.dependency_overrides[kit_source] = lambda: FakeKit([(11, ADDRESS, "active")])

    response = TestClient(app).get("/cron/sync-kit", headers=HEADERS)

    assert response.status_code == 200
    assert response.json() == {"checked": 1, "updated": 1}


async def test_cron_sync_logs_counts_without_addresses(session: AsyncSession) -> None:
    await add_pending(session)
    app = create_app()
    app.dependency_overrides[kit_source] = lambda: FakeKit([(11, ADDRESS, "active")])

    with capture_logs() as logs:
        TestClient(app).get("/cron/sync-kit", headers=HEADERS)

    entry = next(entry for entry in logs if entry["event"] == "kit_synced")
    assert (entry["checked"], entry["updated"]) == (1, 1)
    assert ADDRESS not in str(logs)


def test_cron_sync_without_the_secret_is_refused() -> None:
    assert TestClient(create_app()).get("/cron/sync-kit").status_code == 401


def test_cron_sync_does_nothing_when_kit_is_not_configured() -> None:
    app = create_app()
    app.dependency_overrides[kit_source] = lambda: None

    response = TestClient(app).get("/cron/sync-kit", headers=HEADERS)

    assert response.json() == {"checked": 0, "updated": 0}
