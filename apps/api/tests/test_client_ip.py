from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request
from structlog.testing import capture_logs

from app.core.rate_limit import client_ip, hash_key
from app.core.security import require_service_token


def _request(headers: dict[str, str]) -> Request:
    raw = [(k.encode(), v.encode()) for k, v in headers.items()]
    return Request({"type": "http", "headers": raw, "client": ("9.9.9.9", 1)})


def test_prefers_vercel_header_over_socket() -> None:
    assert client_ip(_request({"x-real-ip": "1.2.3.4"})) == "1.2.3.4"


def test_ignores_client_supplied_forwarded_for() -> None:
    assert client_ip(_request({"x-forwarded-for": "6.6.6.6"})) == "9.9.9.9"


def test_hash_is_stable_case_insensitive_and_not_plain() -> None:
    assert hash_key("A@b.com", "s") == hash_key("a@b.com", "s")
    assert "a@b.com" not in hash_key("a@b.com", "s")


def _app() -> TestClient:
    """A route behind the service token that echoes the IP the rate limiter would use."""
    app = FastAPI()

    @app.get("/ip", dependencies=[Depends(require_service_token)])
    async def ip(request: Request) -> str:
        return client_ip(request)

    return TestClient(app)


GOOD = {"Authorization": "Bearer test-service-token", "X-Real-IP": "10.0.0.1"}


def test_bff_header_is_used_after_service_token_check() -> None:
    response = _app().get("/ip", headers={**GOOD, "X-Client-IP": "203.0.113.9"})
    assert response.json() == "203.0.113.9"


def test_bff_header_is_ignored_without_valid_service_token() -> None:
    headers = {"x-real-ip": "10.0.0.1", "x-client-ip": "6.6.6.6"}
    assert client_ip(_request(headers)) == "10.0.0.1"


def test_malformed_bff_header_falls_back_to_vercel_header() -> None:
    response = _app().get("/ip", headers={**GOOD, "X-Client-IP": "not-an-ip"})
    assert response.json() == "10.0.0.1"


def _events(client_ip_header: str | None) -> list[str]:
    headers = dict(GOOD)
    if client_ip_header is not None:
        headers["X-Client-IP"] = client_ip_header
    with capture_logs() as logs:
        _app().get("/ip", headers=headers)
    return [log["event"] for log in logs]


def test_fallback_to_the_proxy_address_is_logged_when_the_bff_ip_is_missing() -> None:
    assert _events(None) == ["client_ip_fallback"]


def test_fallback_is_logged_when_the_bff_ip_is_malformed_without_the_value() -> None:
    with capture_logs() as logs:
        _app().get("/ip", headers={**GOOD, "X-Client-IP": "not-an-ip"})
    assert [log["event"] for log in logs] == ["client_ip_fallback"]
    assert "not-an-ip" not in str(logs)


def test_no_fallback_is_logged_when_the_bff_ip_is_valid() -> None:
    assert _events("203.0.113.9") == []


def test_ipv6_addresses_in_one_64_share_a_subject() -> None:
    first = client_ip(_request({"x-real-ip": "2001:db8:1:2:aaaa:bbbb:cccc:dddd"}))
    second = client_ip(_request({"x-real-ip": "2001:db8:1:2:1111:2222:3333:4444"}))
    assert first == second == "2001:db8:1:2::"


def test_different_ipv6_64s_stay_apart() -> None:
    first = client_ip(_request({"x-real-ip": "2001:db8:1:2::1"}))
    assert first != client_ip(_request({"x-real-ip": "2001:db8:1:3::1"}))


def test_ipv4_mapped_ipv6_equals_the_ipv4_address() -> None:
    assert client_ip(_request({"x-real-ip": "::ffff:1.2.3.4"})) == "1.2.3.4"


def test_non_ip_values_pass_through() -> None:
    assert client_ip(_request({"x-real-ip": "unknown"})) == "unknown"


def test_the_bff_ipv6_address_is_also_reduced_to_its_64() -> None:
    response = _app().get("/ip", headers={**GOOD, "X-Client-IP": "2001:db8:1:2:aaaa::1"})
    assert response.json() == "2001:db8:1:2::"


def test_the_fallback_log_names_the_path() -> None:
    with capture_logs() as logs:
        _app().get("/ip", headers=GOOD)
    [entry] = [log for log in logs if log["event"] == "client_ip_fallback"]
    assert entry["path"] == "/ip"
