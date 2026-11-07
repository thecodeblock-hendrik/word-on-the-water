import time
from urllib.parse import parse_qs

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.integrations.turnstile import TurnstileUnavailableError, TurnstileVerifier
from app.main import create_app

SECRET = "turnstile-secret"
TOKEN = "token-from-widget"


class FakeCloudflare:
    def __init__(self, status: int = 200, body: dict[str, object] | None = None) -> None:
        self.requests: list[httpx.Request] = []
        self._status = status
        self._body = {"success": True, "error-codes": []} if body is None else body

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return httpx.Response(self._status, json=self._body)

    def verifier(self) -> TurnstileVerifier:
        return TurnstileVerifier(
            SECRET, client=httpx.AsyncClient(transport=httpx.MockTransport(self))
        )


def sent(request: httpx.Request) -> dict[str, list[str]]:
    return parse_qs(request.content.decode())


async def test_a_good_token_is_sent_to_cloudflare_with_the_secret_and_the_visitor_ip() -> None:
    cloudflare = FakeCloudflare()

    assert await cloudflare.verifier().verify(TOKEN, "203.0.113.9") is True

    request = cloudflare.requests[0]
    assert (request.method, str(request.url)) == (
        "POST",
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    )
    assert sent(request) == {"secret": [SECRET], "response": [TOKEN], "remoteip": ["203.0.113.9"]}


async def test_the_visitor_ip_is_left_out_when_unknown() -> None:
    cloudflare = FakeCloudflare()
    await cloudflare.verifier().verify(TOKEN, None)
    assert "remoteip" not in sent(cloudflare.requests[0])


@pytest.mark.parametrize(
    "code",
    ["invalid-input-response", "timeout-or-duplicate", "missing-input-response", "bad-request"],
)
async def test_a_token_cloudflare_refuses_is_simply_not_verified(code: str) -> None:
    cloudflare = FakeCloudflare(body={"success": False, "error-codes": [code]})
    assert await cloudflare.verifier().verify(TOKEN, None) is False


@pytest.mark.parametrize(
    "body",
    [
        {"success": False, "error-codes": ["internal-error"]},
        {"success": False, "error-codes": ["invalid-input-secret"]},
    ],
)
async def test_a_cloudflare_or_key_fault_is_unavailable_not_a_wrong_token(
    body: dict[str, object],
) -> None:
    with pytest.raises(TurnstileUnavailableError):
        await FakeCloudflare(body=body).verifier().verify(TOKEN, None)


@pytest.mark.parametrize("status", [500, 502, 503])
async def test_a_server_error_is_unavailable(status: int) -> None:
    with pytest.raises(TurnstileUnavailableError) as exc:
        await FakeCloudflare(status=status).verifier().verify(TOKEN, None)
    assert SECRET not in str(exc.value) and TOKEN not in str(exc.value)


async def test_a_network_failure_is_unavailable() -> None:
    def refuse(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("no route")

    verifier = TurnstileVerifier(
        SECRET, client=httpx.AsyncClient(transport=httpx.MockTransport(refuse))
    )
    with pytest.raises(TurnstileUnavailableError):
        await verifier.verify(TOKEN, None)


def test_without_a_turnstile_secret_a_sign_up_is_a_503_not_accepted_unchecked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("TURNSTILE_SECRET_KEY", raising=False)
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None)
    body = {
        "email": "reader@example.com",
        "source": "landing_hero",
        "consent_text_version": "v1",
        "rendered_at": int((time.time() - 30) * 1000),
        "turnstile_token": TOKEN,
    }

    response = TestClient(app).post(
        "/v1/subscribers", json=body, headers={"Authorization": "Bearer test-service-token"}
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "turnstile_unavailable"
