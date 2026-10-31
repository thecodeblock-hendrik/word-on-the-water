from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.middleware import MAX_BODY_BYTES
from app.main import create_app

GOOD = {"Authorization": "Bearer test-service-token"}


def chunks(total: int, size: int = 1000) -> Iterator[bytes]:
    """Yield `total` bytes in pieces, so the request has no Content-Length."""
    for _ in range(total // size):
        yield b"x" * size


def test_chunked_body_over_limit_is_rejected(client: TestClient) -> None:
    response = client.post("/v1/ping", headers=GOOD, content=chunks(20_000))
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "payload_too_large"


def test_chunked_body_under_limit_is_passed_through(client: TestClient) -> None:
    response = client.post("/v1/ping", headers=GOOD, content=chunks(5_000))
    assert response.status_code == 405


def test_content_length_over_limit_is_rejected(client: TestClient) -> None:
    body = b"x" * (MAX_BODY_BYTES + 1)
    response = client.post("/v1/ping", headers=GOOD, content=body)
    assert response.status_code == 413


def test_invalid_content_length_is_a_400(client: TestClient) -> None:
    response = client.post("/v1/ping", headers={**GOOD, "Content-Length": "abc"}, content=b"")
    assert response.status_code == 400


def assert_standard_headers(response: object, logged: str | None = None) -> None:
    headers = response.headers  # type: ignore[attr-defined]
    assert len(headers["x-request-id"]) == 32
    assert headers["cache-control"] == "no-store"
    if logged is not None:
        assert headers["x-request-id"] in logged


def test_413_has_request_id_and_no_store(client: TestClient) -> None:
    response = client.post("/v1/ping", headers=GOOD, content=chunks(20_000))
    assert response.status_code == 413
    assert_standard_headers(response)


def test_500_has_request_id_and_no_store(capsys: pytest.CaptureFixture[str]) -> None:
    app = create_app()

    @app.get("/boom")
    async def boom() -> None:
        raise RuntimeError("boom")

    response = TestClient(app, raise_server_exceptions=False).get("/boom")
    assert response.status_code == 500
    assert_standard_headers(response, logged=capsys.readouterr().out)
