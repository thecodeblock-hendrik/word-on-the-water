from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.testing import capture_logs

from app.main import create_app
from app.models import Subscriber
from app.models.subscriber import SubscriberStatus

HEADERS = {"Authorization": "Bearer test-cron-secret"}
STALE = "stale-reader@example.com"


async def add_stale_and_fresh(session: AsyncSession) -> None:
    now = datetime.now(UTC)
    for name, age in (("stale-reader", 10), ("fresh-reader", 1)):
        session.add(
            Subscriber(
                email=f"{name}@example.com",
                status=SubscriberStatus.PENDING,
                consent_text_version="v1",
                consent_at=now - timedelta(days=age),
                source="landing_hero",
                created_at=now - timedelta(days=age),
            )
        )
    await session.commit()


async def test_cron_runs_retention_and_reports_counts(session: AsyncSession) -> None:
    await add_stale_and_fresh(session)

    response = TestClient(create_app()).get("/cron/retention", headers=HEADERS)

    assert response.status_code == 200
    assert response.json() == {
        "subscribers": 1,
        "outbox": 0,
        "prayer_requests": 0,
        "contact_messages": 0,
        "audit_log": 0,
    }
    left = await session.scalar(select(func.count()).select_from(Subscriber))
    assert left == 1


async def test_cron_retention_logs_counts_without_addresses(session: AsyncSession) -> None:
    await add_stale_and_fresh(session)

    client = TestClient(
        create_app()
    )  # built first: it configures logging, which would undo the capture
    with capture_logs() as logs:
        client.get("/cron/retention", headers=HEADERS)

    entry = next((e for e in logs if e["event"] == "retention_run"), None)
    assert entry is not None, logs
    assert entry["subscribers"] == 1
    assert STALE not in str(logs) and "example.com" not in str(logs)
