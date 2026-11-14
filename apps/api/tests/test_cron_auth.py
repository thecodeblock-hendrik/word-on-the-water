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
@pytest.mark.parametrize("path", ["/cron/drain-outbox", "/cron/retention"])
def test_cron_endpoints_reject_bad_credentials(
    client: TestClient, path: str, headers: dict[str, str]
) -> None:
    response = client.get(path, headers=headers)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
