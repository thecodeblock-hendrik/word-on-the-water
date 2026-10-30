from fastapi.testclient import TestClient

from app.main import create_app


def test_ready_ok_with_local_services(local_services: None) -> None:
    response = TestClient(create_app()).get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_503_without_database(client: TestClient) -> None:
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "not_ready"
