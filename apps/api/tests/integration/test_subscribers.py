import time
from collections.abc import Mapping
from datetime import UTC, datetime

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.testing import capture_logs

from app.main import create_app
from app.models import EmailOutbox, Subscriber
from app.models.subscriber import SubscriberStatus
from app.schemas.subscribers import SubscribeRequest
from app.services.subscribers import request_subscription

AUTH = {"Authorization": "Bearer test-service-token"}


def rendered(seconds_ago: float) -> int:
    return int((time.time() - seconds_ago) * 1000)


BODY = {
    "email": "reader@example.com",
    "first_name": "Ann",
    "source": "landing_hero",
    "consent_text_version": "v1",
    "website": "",
    "rendered_at": rendered(30),
}


def post(body: Mapping[str, object] = BODY, headers: Mapping[str, str] = AUTH) -> httpx2.Response:
    return TestClient(create_app()).post("/v1/subscribers", json=body, headers=headers)


async def jobs(session: AsyncSession) -> list[EmailOutbox]:
    return list(
        await session.scalars(select(EmailOutbox).where(EmailOutbox.template == "kit_subscribe"))
    )


async def add_subscriber(session: AsyncSession, status: SubscriberStatus) -> None:
    session.add(
        Subscriber(
            email=str(BODY["email"]),
            status=status,
            consent_text_version="v0",
            consent_at=datetime(2026, 1, 1, tzinfo=UTC),
            source="earlier",
        )
    )
    await session.commit()


async def test_a_new_address_is_stored_as_pending_with_its_consent_and_queued_for_kit(
    session: AsyncSession,
) -> None:
    response = post()

    assert response.status_code == 202
    assert response.json() == {"status": "check_your_inbox"}
    row = await session.scalar(select(Subscriber))
    assert row is not None
    assert (row.email, row.first_name, row.status) == (
        "reader@example.com",
        "Ann",
        SubscriberStatus.PENDING,
    )
    assert (row.source, row.consent_text_version) == ("landing_hero", "v1")
    assert row.consent_at <= datetime.now(UTC)
    [job] = await jobs(session)
    assert job.to_address == "reader@example.com"
    assert job.payload == {
        "first_name": "Ann",
        "source": "landing_hero",
        "consent_text_version": "v1",
    }


@pytest.mark.parametrize(
    ("status", "queued"),
    [
        (SubscriberStatus.PENDING, 1),
        (SubscriberStatus.ACTIVE, 0),
        (SubscriberStatus.UNSUBSCRIBED, 0),
        (SubscriberStatus.BOUNCED, 0),
    ],
)
async def test_an_existing_address_gets_the_same_answer_and_is_queued_only_if_still_pending(
    session: AsyncSession, status: SubscriberStatus, queued: int
) -> None:
    await add_subscriber(session, status)

    response = post()

    assert (response.status_code, response.json()) == (202, {"status": "check_your_inbox"})
    assert len(await jobs(session)) == queued
    rows = list(await session.scalars(select(Subscriber)))
    assert [(r.status, r.source) for r in rows] == [(status, "earlier")]


async def test_the_same_address_in_another_case_is_the_same_subscriber(
    session: AsyncSession,
) -> None:
    post()
    post({**BODY, "email": "Reader@Example.com"})

    assert len(list(await session.scalars(select(Subscriber)))) == 1


async def test_an_invalid_request_is_a_422_and_stores_nothing(session: AsyncSession) -> None:
    response = post({**BODY, "email": "nope"})

    assert response.status_code == 422
    assert list(await session.scalars(select(Subscriber))) == []
    assert await jobs(session) == []


async def test_without_the_service_token_it_is_a_401(session: AsyncSession) -> None:
    assert post(headers={}).status_code == 401
    assert list(await session.scalars(select(Subscriber))) == []


@pytest.mark.parametrize(
    ("status", "queued"),
    [(None, 1), (SubscriberStatus.PENDING, 1), (SubscriberStatus.ACTIVE, 0)],
)
async def test_the_service_queues_new_and_pending_addresses_only(
    session: AsyncSession, status: SubscriberStatus | None, queued: int
) -> None:
    if status is not None:
        await add_subscriber(session, status)

    await request_subscription(session, SubscribeRequest.model_validate(BODY))

    assert len(await jobs(session)) == queued


@pytest.mark.parametrize(
    "change",
    [{"website": "http://spam.example"}, {"rendered_at": rendered(0.2)}],
    ids=["hidden field filled", "sent too fast"],
)
async def test_a_bot_gets_the_normal_answer_and_nothing_is_stored(
    session: AsyncSession, change: dict[str, object]
) -> None:
    response = post({**BODY, **change})

    assert (response.status_code, response.json()) == (202, {"status": "check_your_inbox"})
    assert list(await session.scalars(select(Subscriber))) == []
    assert await jobs(session) == []


async def test_a_bot_is_logged_with_the_reason_and_without_the_address(
    session: AsyncSession,
) -> None:
    client = TestClient(create_app())  # building the app sets up logging, so do it first
    with capture_logs() as logs:
        client.post(
            "/v1/subscribers", json={**BODY, "website": "http://spam.example"}, headers=AUTH
        )

    entry = next(entry for entry in logs if entry["event"] == "signup_bot_rejected")
    assert entry["reason"] == "honeypot"
    assert "reader@example.com" not in str(logs) and "spam.example" not in str(logs)
