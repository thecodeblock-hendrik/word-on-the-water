import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer wrong"},
        {"Authorization": "Bearer test-service-token"},
    ],
)
def test_drain_endpoint_rejects_bad_credentials(
    client: TestClient, headers: dict[str, str]
) -> None:
    response = client.get("/cron/drain-outbox", headers=headers)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
