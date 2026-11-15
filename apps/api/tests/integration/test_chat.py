"""POST /v1/chat/messages against real Redis (`make up`)."""

import json
import time
from collections.abc import Mapping

import httpx2
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from structlog.testing import capture_logs

from app.core.config import get_settings
from app.core.observability import scrub_event
from app.main import create_app

AUTH = {"Authorization": "Bearer test-service-token"}
MARKER = "zq7xmarker"
PHONE = "082 555 0199"


def rendered(seconds_ago: float = 30) -> int:
    return int((time.time() - seconds_ago) * 1000)


@pytest.fixture(autouse=True)
def chat_on(local_services: None, fresh_limits: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CHAT_ENABLED", "1")
    get_settings.cache_clear()


def post(
    body: Mapping[str, object],
    headers: Mapping[str, str] = AUTH,
    ip: str = "203.0.113.1",
    app: FastAPI | None = None,
) -> httpx2.Response:
    full = {"rendered_at": rendered(), "website": "", **body}
    return TestClient(app or create_app()).post(
        "/v1/chat/messages", json=full, headers={"X-Client-IP": ip, **headers}
    )


def test_a_question_gets_an_answer_with_the_entry() -> None:
    response = post({"message": "Who is Jesus?"})

    assert response.status_code == 200
    body = response.json()
    assert body["kind"] == "answer"
    assert body["entry"]["id"] == "2.1"
    assert response.headers["cache-control"] == "no-store"


def test_a_chip_and_a_follow_up_use_the_context() -> None:
    first = post({"entry_id": "2.6"}).json()
    context = {"last_entry_id": "2.6", "seen_entry_ids": ["2.6"]}

    more = post({"action": "more", "context": context}).json()

    assert (first["kind"], more["kind"], more["expand"]) == ("answer", "answer", True)


def test_a_term_chip_returns_the_term() -> None:
    body = post({"action": "term", "term": "grace"}).json()
    assert (body["kind"], body["term"]["term"].lower()) == ("term", "grace")


@pytest.mark.parametrize(
    ("body", "kind"),
    [
        ({"message": "what is the best pizza topping"}, "no_answer"),
        ({"message": "hello"}, "smalltalk"),
        ({"message": "I want to end my life"}, "crisis"),
        ({"message": "call me on 082 555 0199"}, "rejected"),
        ({"entry_id": "99.99"}, "rejected"),
    ],
)
def test_each_reply_kind(body: dict[str, object], kind: str) -> None:
    assert post(body).json()["kind"] == kind


def test_a_crisis_reply_carries_the_helpline_text() -> None:
    assert "0800 567 567" in post({"message": "I want to end my life"}).json()["text"]


def test_a_forged_context_is_rejected_not_an_error() -> None:
    body = post({"message": "grace", "context": {"last_entry_id": "nope"}}).json()
    assert (body["kind"], body["reason"]) == ("rejected", "bad_context")


@pytest.mark.parametrize(
    "body",
    [
        {"message": "hi", "entry_id": "2.1"},
        {},
        {"message": "hi", "surprise": 1},
        {"message": "hi", "context": {"surprise": 1}},
        {"message": "hi", "context": {"seen_entry_ids": ["2.1"] * 21}},
        {"action": "term"},
    ],
)
def test_a_malformed_body_is_a_422(body: dict[str, object]) -> None:
    assert post(body).status_code == 422


def test_no_service_token_is_a_401() -> None:
    assert post({"message": "hi"}, headers={}).status_code == 401


def test_the_31st_message_in_ten_minutes_is_a_429_with_retry_after() -> None:
    for _ in range(30):
        assert post({"message": "who is jesus"}).status_code == 200

    response = post({"message": "who is jesus"})

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"
    assert response.headers["retry-after"] == "600"


def test_two_visitors_have_separate_allowances() -> None:
    for _ in range(30):
        post({"message": "who is jesus"}, ip="203.0.113.1")

    assert post({"message": "who is jesus"}, ip="203.0.113.2").status_code == 200


@pytest.mark.parametrize("reason", ["honeypot", "too_fast"])
def test_a_bot_gets_a_normal_looking_reply_and_no_work_is_done(reason: str) -> None:
    extra = (
        {"website": "http://spam.example"} if reason == "honeypot" else {"rendered_at": rendered(0)}
    )
    app = create_app()
    with capture_logs() as logs:
        response = post({"message": "who is jesus", **extra}, app=app)

    assert response.status_code == 200
    assert response.json()["kind"] == "no_answer"
    assert [e["reason"] for e in logs if e["event"] == "chat_bot_rejected"] == [reason]
    assert not [e for e in logs if e["event"] == "chat_reply"]


def test_a_wrong_content_type_is_refused() -> None:
    response = TestClient(create_app()).post(
        "/v1/chat/messages", content="message=hi", headers={**AUTH, "X-Client-IP": "203.0.113.1"}
    )
    assert response.status_code == 422


def test_a_body_over_the_limit_is_a_413() -> None:
    response = post({"message": "x" * 20_000})
    assert response.status_code == 413


def test_chat_off_is_a_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CHAT_ENABLED", "")
    get_settings.cache_clear()

    response = post({"message": "who is jesus"})

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "chat_unavailable"


def test_one_log_line_per_request_holds_kind_and_entry_and_no_text() -> None:
    app = create_app()
    with capture_logs() as logs:
        post({"message": "Who is Jesus?"}, app=app)

    [line] = [e for e in logs if e["event"] == "chat_reply"]
    assert (line["kind"], line["entry_id"]) == ("answer", "2.1")
    assert set(line) <= {"event", "log_level", "kind", "entry_id", "latency_ms"}


def test_a_message_never_reaches_logs_errors_or_sentry(capfd: pytest.CaptureFixture[str]) -> None:
    text = f"{MARKER} my number is {PHONE}"
    app = create_app()
    with capture_logs() as logs:
        responses = [
            post({"message": text}, app=app),
            post({"message": text, "surprise": 1}, app=app),
            post({"message": text}, headers={}, app=app),
            post({"message": text, "context": {"last_entry_id": MARKER}}, app=app),
            post({"message": MARKER * 5000}, app=app),
        ]

    seen = json.dumps(logs) + capfd.readouterr().out + capfd.readouterr().err
    seen += "".join(r.text for r in responses)
    assert MARKER not in seen
    assert PHONE not in seen
    event = {"request": {"data": text, "url": "/v1/chat/messages"}}
    assert MARKER not in json.dumps(scrub_event(event, {}))
