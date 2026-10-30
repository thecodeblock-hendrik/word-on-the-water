from starlette.requests import Request

from app.core.rate_limit import client_ip, hash_key


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
