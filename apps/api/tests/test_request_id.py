"""Every response has an X-Request-ID, and each log line of that request carries the same id."""

import json

import pytest
import structlog
from fastapi.testclient import TestClient

from app.main import create_app

log = structlog.get_logger()


def boom() -> None:
    raise ValueError("boom")


def hello() -> dict[str, str]:
    log.info("hello")
    return {"status": "ok"}


@pytest.fixture
def client() -> TestClient:
    app = create_app()
    app.add_api_route("/boom", boom)
    app.add_api_route("/hello", hello)
    return TestClient(app, raise_server_exceptions=False)


def log_request_ids(output: str) -> list[str | None]:
    lines = [json.loads(line) for line in output.splitlines() if line.startswith("{")]
    return [line.get("request_id") for line in lines]


def test_every_response_has_a_distinct_request_id(client: TestClient) -> None:
    responses = [
        client.get("/hello"),
        client.get("/does-not-exist"),
        client.post("/health/live"),
        client.get("/v1/ping"),
        client.get("/boom"),
        client.post("/v1/ping", content=b"x" * 20_000),
    ]
    ids = [r.headers.get("x-request-id") for r in responses]
    assert [r.status_code for r in responses] == [200, 404, 405, 401, 500, 413]
    assert all(ids)
    assert len(set(ids)) == len(ids)


def test_every_log_line_carries_the_id_of_its_response(
    client: TestClient, capfd: pytest.CaptureFixture[str]
) -> None:
    ok, failed = client.get("/hello"), client.get("/boom")
    ids = log_request_ids(capfd.readouterr().out)
    assert ids == [ok.headers["x-request-id"], failed.headers["x-request-id"]]
