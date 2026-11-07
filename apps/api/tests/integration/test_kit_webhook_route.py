import hashlib
import hmac
import json
import time
from datetime import UTC, datetime
from typing import Any

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.testing import capture_logs

from app.core.config import get_settings
from app.main import create_app
from app.models import Subscriber
from app.models.subscriber import SubscriberStatus
from app.services.kit_events import apply_kit_event

SECRET = "whsec_" + "0f1e2d3c" * 4
pytestmark = pytest.mark.usefixtures("fresh_limits")


@pytest.fixture(autouse=True)
def webhook_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KIT_WEBHOOK_SECRET", SECRET)
    get_settings.cache_clear()


def delivery(*events: tuple[str, str, int, str]) -> bytes:
    """Events as (id, type, kit id, email), in Kit's delivery format."""
    return json.dumps(
        {
            "delivery_id": 1,
            "events": [
                {
                    "id": event_id,
                    "type": type_,
                    "created": "2026-12-01T12:00:00Z",
                    "data": {"subscriber": {"id": kit_id, "email_address": email, "state": "x"}},
                }
                for event_id, type_, kit_id, email in events
            ],
        }
    ).encode()


def signed(body: bytes, t: float | None = None, secret: str = SECRET) -> dict[str, str]:
    stamp = int(time.time() if t is None else t)
    digest = hmac.new(secret.encode(), f"{stamp}.".encode() + body, hashlib.sha256).hexdigest()
    return {"X-Kit-Signature": f"t={stamp},v1={digest}", "Content-Type": "application/json"}


def post(body: bytes, headers: dict[str, str] | None = None) -> httpx2.Response:
    # No service token: the signature is the only credential this route has.
    return TestClient(create_app()).post(
        "/v1/webhooks/kit", content=body, headers=signed(body) if headers is None else headers
    )


async def add(session: AsyncSession, status: SubscriberStatus = SubscriberStatus.PENDING) -> None:
    session.add(
        Subscriber(
            email="reader@example.com",
            status=status,
            consent_text_version="v1",
            consent_at=datetime(2026, 1, 1, tzinfo=UTC),
            source="landing_hero",
        )
    )
    await session.commit()


async def status_of(session: AsyncSession) -> SubscriberStatus:
    session.expire_all()
    row = await session.scalar(select(Subscriber))
    assert row is not None
    status: SubscriberStatus = row.status
    return status


async def test_a_signed_confirmation_activates_the_subscriber(session: AsyncSession) -> None:
    await add(session)

    response = post(delivery(("e1", "subscriber.activated", 4242, "reader@example.com")))

    assert (response.status_code, response.json()) == (200, {"received": 1})
    assert await status_of(session) is SubscriberStatus.ACTIVE


@pytest.mark.parametrize(
    "header", [None, "t=1,v1=abc", "garbage"], ids=["missing", "wrong", "junk"]
)
async def test_an_unsigned_or_wrongly_signed_call_is_a_401_and_changes_nothing(
    session: AsyncSession, header: str | None
) -> None:
    await add(session)
    body = delivery(("e1", "subscriber.activated", 4242, "reader@example.com"))

    response = post(body, {} if header is None else {"X-Kit-Signature": header})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_signature"
    assert await status_of(session) is SubscriberStatus.PENDING


async def test_a_signature_made_with_another_secret_is_refused(session: AsyncSession) -> None:
    await add(session)
    body = delivery(("e1", "subscriber.activated", 4242, "reader@example.com"))

    assert post(body, signed(body, secret="whsec_attacker")).status_code == 401


async def test_an_old_delivery_is_refused_so_a_captured_one_cannot_be_replayed(
    session: AsyncSession,
) -> None:
    await add(session)
    body = delivery(("e1", "subscriber.activated", 4242, "reader@example.com"))

    assert post(body, signed(body, t=time.time() - 3600)).status_code == 401


async def test_without_a_secret_configured_it_is_a_503_so_kit_tries_again(
    monkeypatch: pytest.MonkeyPatch, session: AsyncSession
) -> None:
    monkeypatch.delenv("KIT_WEBHOOK_SECRET")
    get_settings.cache_clear()
    body = delivery(("e1", "subscriber.activated", 4242, "reader@example.com"))

    response = post(body)

    assert (response.status_code, response.json()["error"]["code"]) == (
        503,
        "webhook_not_configured",
    )


async def test_a_signed_body_that_is_not_a_delivery_is_a_400() -> None:
    assert post(b"not json").status_code == 400
    assert post(b'{"events": "nope"}').status_code == 400


async def test_a_huge_body_is_a_413() -> None:
    assert post(b"x" * 1_100_000).status_code == 413


async def test_the_same_event_sent_twice_is_applied_once(session: AsyncSession) -> None:
    await add(session)
    body = delivery(("e1", "subscriber.activated", 4242, "reader@example.com"))
    post(body)
    row = await session.scalar(select(Subscriber))
    assert row is not None
    row.status = SubscriberStatus.UNSUBSCRIBED  # changed since, by a later event
    await session.commit()

    response = post(body)

    assert response.status_code == 200
    assert await status_of(session) is SubscriberStatus.UNSUBSCRIBED


async def test_a_batch_is_applied_in_order_and_an_unknown_person_does_not_stop_it(
    session: AsyncSession,
) -> None:
    await add(session)
    body = delivery(
        ("e1", "subscriber.activated", 9, "stranger@example.com"),
        ("e2", "subscriber.activated", 4242, "reader@example.com"),
        ("e3", "subscriber.unsubscribed", 4242, "reader@example.com"),
    )

    response = post(body)

    assert response.json() == {"received": 3}
    assert await status_of(session) is SubscriberStatus.UNSUBSCRIBED


async def test_a_failure_gives_a_500_and_the_retry_is_not_mistaken_for_a_duplicate(
    monkeypatch: pytest.MonkeyPatch, session: AsyncSession
) -> None:
    await add(session)
    body = delivery(("e1", "subscriber.activated", 4242, "reader@example.com"))
    calls = {"n": 0}

    async def flaky(*args: Any, **kwargs: Any) -> bool:
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("database hiccup")
        return await apply_kit_event(*args, **kwargs)

    monkeypatch.setattr("app.routers.webhooks.apply_kit_event", flaky)

    first = TestClient(create_app(), raise_server_exceptions=False).post(
        "/v1/webhooks/kit", content=body, headers=signed(body)
    )
    second = post(body)

    assert first.status_code == 500
    assert second.status_code == 200
    assert await status_of(session) is SubscriberStatus.ACTIVE


async def test_it_logs_what_arrived_without_any_address(session: AsyncSession) -> None:
    await add(session)
    body = delivery(("e1", "subscriber.activated", 4242, "reader@example.com"))
    app = create_app()  # building the app sets up logging, so do it first
    with capture_logs() as logs:
        TestClient(app).post("/v1/webhooks/kit", content=body, headers=signed(body))

    entry = next(e for e in logs if e["event"] == "kit_webhook_received")
    assert (entry["events"], entry["updated"]) == (1, 1)
    assert "reader@example.com" not in str(logs)


async def test_a_full_delivery_of_a_hundred_events_is_not_cut_off_by_the_general_size_limit(
    session: AsyncSession,
) -> None:
    await add(session)
    events = [
        (f"e{n}", "subscriber.activated", 1000 + n, f"someone{n}@example.com") for n in range(100)
    ]
    body = delivery(*events)
    assert len(body) > 16 * 1024  # more than any other route accepts

    response = post(body)

    assert (response.status_code, response.json()) == (200, {"received": 100})
