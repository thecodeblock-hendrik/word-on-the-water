"""No request body, token, email or prayer text may reach the log stream."""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

PRAYER = "Please pray for my mother, she has cancer"
EMAIL = "jo" + "@example.com"
SECRET_HEADER = "Bearer not-a-real-token-" + "x" * 8


def boom() -> None:
    raise ValueError(f"failed for {EMAIL}: {PRAYER}")


def send_sensitive_requests(client: TestClient) -> None:
    body = {"email": EMAIL, "body": PRAYER}
    headers = {"Authorization": SECRET_HEADER, "X-Client-IP": "203.0.113.9"}
    client.get("/v1/ping", headers=headers)
    client.post("/v1/ping", json=body, headers=headers)
    client.post("/health/live", json=body)
    client.get("/does-not-exist", params=body)
    client.post("/v1/ping", content=PRAYER.encode() * 1000, headers=headers)
    client.get("/boom", headers=headers)


def test_logs_hold_no_personal_data_or_secrets(capfd: pytest.CaptureFixture[str]) -> None:
    app = create_app()
    app.add_api_route("/boom", boom)
    send_sensitive_requests(TestClient(app, raise_server_exceptions=False))

    captured = capfd.readouterr()
    output = captured.out + captured.err
    events = [json.loads(line)["event"] for line in output.splitlines() if line.startswith("{")]
    assert "unhandled_error" in events
    for secret in (EMAIL, PRAYER, SECRET_HEADER, "203.0.113.9", "not-a-real-token"):
        assert secret not in output
