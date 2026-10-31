from fastapi.testclient import TestClient

GOOD = {"Authorization": "Bearer test-service-token"}


def test_v1_requires_token(client: TestClient) -> None:
    response = client.get("/v1/ping")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_v1_rejects_wrong_token(client: TestClient) -> None:
    assert client.get("/v1/ping", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_v1_rejects_other_scheme(client: TestClient) -> None:
    headers = {"Authorization": "Basic test-service-token"}
    assert client.get("/v1/ping", headers=headers).status_code == 401


def test_v1_accepts_token(client: TestClient) -> None:
    assert client.get("/v1/ping", headers=GOOD).status_code == 200


def test_health_needs_no_token(client: TestClient) -> None:
    assert client.get("/health/live").status_code == 200


def test_v1_rejects_non_ascii_token(client: TestClient) -> None:
    headers = {b"Authorization": "Bearer café".encode()}
    response = client.get("/v1/ping", headers=headers)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_cron_rejects_non_ascii_token(client: TestClient) -> None:
    headers = {b"Authorization": "Bearer café".encode()}
    response = client.get("/cron/drain-outbox", headers=headers)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
