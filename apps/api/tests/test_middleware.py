from collections.abc import Iterator

from fastapi.testclient import TestClient

from app.core.middleware import MAX_BODY_BYTES

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
