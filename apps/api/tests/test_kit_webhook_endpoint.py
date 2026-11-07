import json
from pathlib import Path

import httpx
import pytest

from app.integrations.kit.webhook_endpoint import (
    EVENTS,
    AlreadyRegisteredError,
    register_webhook,
    save_secret,
)

URL = "https://wotw-api.example.com/v1/webhooks/kit"
SECRET = "whsec_" + "ab12cd34" * 4


def client(handler: httpx.MockTransport | None = None, existing: list[str] | None = None):  # type: ignore[no-untyped-def]
    seen: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.method == "GET":
            listed = [{"id": 7, "url": url} for url in existing or []]
            return httpx.Response(200, json={"webhook_endpoints": listed})
        return httpx.Response(
            201, json={"webhook_endpoint": {"id": 99, "url": URL, "secret": SECRET}}
        )

    return httpx.Client(transport=handler or httpx.MockTransport(respond)), seen


def test_it_registers_the_four_subscriber_events_and_returns_the_id_and_secret() -> None:
    http, seen = client()

    endpoint_id, secret = register_webhook(http, "kit-api-key", URL)

    assert (endpoint_id, secret) == (99, SECRET)
    post = next(r for r in seen if r.method == "POST")
    assert str(post.url) == "https://api.kit.com/v4/webhook_endpoints"
    assert post.headers["x-kit-api-key"] == "kit-api-key"
    body = json.loads(post.content)
    assert body["url"] == URL
    assert (
        body["events"]
        == [
            "subscriber.activated",
            "subscriber.unsubscribed",
            "subscriber.bounced",
            "subscriber.complained",
        ]
        == EVENTS
    )


def test_the_events_are_plain_strings_as_kits_api_wants() -> None:
    assert all(isinstance(event, str) for event in EVENTS)


@pytest.mark.parametrize("url", ["http://api.example.com/hook", "ftp://x/y", "not a url", ""])
def test_only_https_addresses_are_registered(url: str) -> None:
    http, seen = client()
    with pytest.raises(ValueError, match="https"):
        register_webhook(http, "k", url)
    assert seen == []


def test_an_address_that_is_already_registered_is_refused_because_its_secret_cannot_be_read() -> (
    None
):
    http, seen = client(existing=[URL])

    with pytest.raises(AlreadyRegisteredError):
        register_webhook(http, "k", URL)

    assert [r.method for r in seen] == ["GET"]


def test_a_refusal_from_kit_raises_without_the_key() -> None:
    http = httpx.Client(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(
                401 if r.method == "POST" else 200, json={"webhook_endpoints": []}
            )
        )
    )
    with pytest.raises(RuntimeError) as exc:
        register_webhook(http, "kit-api-key", URL)
    assert "401" in str(exc.value) and "kit-api-key" not in str(exc.value)


def test_the_secret_is_saved_in_the_env_file_replacing_an_old_one(tmp_path: Path) -> None:
    env = tmp_path / ".env"
    env.write_text("A=1\nKIT_WEBHOOK_SECRET=old\nB=2\n")

    save_secret(env, SECRET)

    assert env.read_text() == f"A=1\nKIT_WEBHOOK_SECRET={SECRET}\nB=2\n"


def test_the_secret_is_added_when_the_file_has_none(tmp_path: Path) -> None:
    env = tmp_path / ".env"
    env.write_text("A=1")

    save_secret(env, SECRET)

    assert env.read_text() == f"A=1\nKIT_WEBHOOK_SECRET={SECRET}\n"
