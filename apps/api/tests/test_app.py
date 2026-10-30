from fastapi.testclient import TestClient


def test_live(client: TestClient) -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_response_has_request_id_and_no_store(client: TestClient) -> None:
    response = client.get("/health/live")
    assert len(response.headers["x-request-id"]) == 32
    assert response.headers["cache-control"] == "no-store"


def test_unknown_route_uses_error_shape(client: TestClient) -> None:
    response = client.get("/nope")
    assert response.status_code == 404
    assert response.json() == {"error": {"code": "not_found", "message": "Request failed."}}


def test_oversized_body_rejected(client: TestClient) -> None:
    response = client.post("/health/live", content=b"x" * 20000)
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "payload_too_large"
