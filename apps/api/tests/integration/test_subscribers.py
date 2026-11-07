import time
from collections.abc import Mapping
from datetime import UTC, datetime

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.testing import capture_logs

from app.integrations.turnstile import TurnstileUnavailableError
from app.main import create_app
from app.models import EmailOutbox, Subscriber
from app.models.subscriber import SubscriberStatus
from app.routers.v1 import turnstile_verifier
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
    "turnstile_token": "token-from-widget",
}


class FakeTurnstile:
    """Stands in for Cloudflare: passes, fails or is down, and remembers what it was asked."""

    def __init__(self, outcome: bool | Exception = True) -> None:
        self.outcome = outcome
        self.calls: list[tuple[str, str | None]] = []

    async def verify(self, token: str, remote_ip: str | None) -> bool:
        self.calls.append((token, remote_ip))
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome


pytestmark = pytest.mark.usefixtures("fresh_limits")


def post(
    body: Mapping[str, object] = BODY,
    headers: Mapping[str, str] = AUTH,
    turnstile: FakeTurnstile | None = None,
    ip: str = "203.0.113.1",
) -> httpx2.Response:
    app = create_app()
    app.dependency_overrides[turnstile_verifier] = lambda: turnstile or FakeTurnstile()
    sent = {"X-Client-IP": ip, **headers}
    return TestClient(app).post("/v1/subscribers", json=body, headers=sent)


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
    app = create_app()  # building the app sets up logging, so do it first
    app.dependency_overrides[turnstile_verifier] = lambda: FakeTurnstile()
    with capture_logs() as logs:
        TestClient(app).post(
            "/v1/subscribers", json={**BODY, "website": "http://spam.example"}, headers=AUTH
        )

    entry = next(entry for entry in logs if entry["event"] == "signup_bot_rejected")
    assert entry["reason"] == "honeypot"
    assert "reader@example.com" not in str(logs) and "spam.example" not in str(logs)


async def test_the_token_and_the_visitor_ip_go_to_cloudflare(session: AsyncSession) -> None:
    turnstile = FakeTurnstile()

    post(headers={**AUTH, "X-Client-IP": "203.0.113.9"}, turnstile=turnstile)

    assert turnstile.calls == [("token-from-widget", "203.0.113.9")]


async def test_a_token_cloudflare_refuses_is_a_400_and_stores_nothing(
    session: AsyncSession,
) -> None:
    response = post(turnstile=FakeTurnstile(False))

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "turnstile_failed"
    assert list(await session.scalars(select(Subscriber))) == []
    assert await jobs(session) == []


async def test_when_cloudflare_is_down_it_is_a_503_and_nothing_is_stored(
    session: AsyncSession,
) -> None:
    response = post(turnstile=FakeTurnstile(TurnstileUnavailableError("down")))

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "turnstile_unavailable"
    assert list(await session.scalars(select(Subscriber))) == []


async def test_a_bot_caught_by_the_cheap_checks_never_costs_a_cloudflare_call(
    session: AsyncSession,
) -> None:
    turnstile = FakeTurnstile()

    post({**BODY, "website": "http://spam.example"}, turnstile=turnstile)

    assert turnstile.calls == []


def other_person(n: int) -> dict[str, object]:
    return {**BODY, "email": f"reader{n}@example.com"}


async def test_the_sixth_sign_up_in_an_hour_from_one_address_is_a_429(
    session: AsyncSession,
) -> None:
    for n in range(5):
        assert post(other_person(n)).status_code == 202

    response = post(other_person(5))

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"
    assert response.headers["Retry-After"] == "3600"
    assert len(list(await session.scalars(select(Subscriber)))) == 5


async def test_another_address_has_its_own_allowance() -> None:
    for n in range(5):
        post(other_person(n))

    assert post(other_person(9), ip="203.0.113.77").status_code == 202


async def test_one_email_cannot_be_asked_for_more_than_three_times_an_hour(
    session: AsyncSession,
) -> None:
    for n in range(3):
        assert post(ip=f"203.0.113.{10 + n}").status_code == 202

    response = post(ip="203.0.113.99")

    assert response.status_code == 429
    assert len(await jobs(session)) == 3  # a fourth confirmation email is never queued


async def test_a_bot_in_a_flood_is_stopped_by_the_limit_too(session: AsyncSession) -> None:
    for n in range(5):
        post({**other_person(n), "website": "x"})

    assert post(other_person(6)).status_code == 429


KEY = {"Idempotency-Key": "11111111-2222-3333-4444-555555555555"}


async def test_a_repeated_post_with_the_same_key_does_the_work_once(session: AsyncSession) -> None:
    turnstile = FakeTurnstile()

    first = post(headers={**AUTH, **KEY}, turnstile=turnstile)
    second = post(headers={**AUTH, **KEY}, turnstile=turnstile)

    assert (first.status_code, first.json()) == (second.status_code, second.json())
    assert len(turnstile.calls) == 1
    assert len(await jobs(session)) == 1


async def test_repeats_with_the_same_key_do_not_use_up_the_allowance() -> None:
    for _ in range(8):
        post(headers={**AUTH, **KEY})

    assert post(other_person(1)).status_code == 202


async def test_the_same_key_for_another_address_is_a_new_sign_up(session: AsyncSession) -> None:
    post(headers={**AUTH, **KEY})
    post(other_person(1), headers={**AUTH, **KEY})

    assert len(list(await session.scalars(select(Subscriber)))) == 2


async def test_a_failed_attempt_does_not_use_up_its_key(session: AsyncSession) -> None:
    refused = post(headers={**AUTH, **KEY}, turnstile=FakeTurnstile(False))
    retried = post(headers={**AUTH, **KEY}, turnstile=FakeTurnstile(True))

    assert (refused.status_code, retried.status_code) == (400, 202)
    assert len(await jobs(session)) == 1


@pytest.mark.parametrize("key", ["short", "has spaces in it!!", "x" * 129])
async def test_a_malformed_key_is_a_422(key: str) -> None:
    assert post(headers={**AUTH, "Idempotency-Key": key}).status_code == 422
