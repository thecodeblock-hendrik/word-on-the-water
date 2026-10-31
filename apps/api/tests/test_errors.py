from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request
from structlog.testing import capture_logs

from app.core.errors import ApiError, _unhandled, register_error_handlers


def _failing_app() -> FastAPI:
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/boom")
    async def boom() -> None:
        raise RuntimeError("secret detail postgres://user:pw@host")

    return app


def test_unhandled_error_returns_generic_500() -> None:
    response = TestClient(_failing_app(), raise_server_exceptions=False).get("/boom")
    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "Something went wrong."}
    }


def test_unhandled_error_logs_type_and_path_without_message() -> None:
    with capture_logs() as logs:
        TestClient(_failing_app(), raise_server_exceptions=False).get("/boom")
    entry = next(entry for entry in logs if entry["event"] == "unhandled_error")
    assert entry["error"] == "RuntimeError"
    assert entry["path"] == "/boom"
    assert entry["where"].startswith("test_errors.py:")
    assert "secret detail" not in str(logs)


def _header_app() -> FastAPI:
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/only-get")
    async def only_get() -> None: ...

    @app.get("/auth")
    async def auth() -> None:
        raise HTTPException(401, headers={"WWW-Authenticate": "Bearer"})

    @app.get("/slow-down")
    async def slow_down() -> None:
        raise ApiError(429, "rate_limited", "Slow down.", headers={"Retry-After": "60"})

    return app


def test_405_keeps_the_allow_header() -> None:
    response = TestClient(_header_app()).post("/only-get")
    assert response.status_code == 405
    assert response.headers["allow"] == "GET"


def test_http_exception_keeps_its_headers() -> None:
    response = TestClient(_header_app()).get("/auth")
    assert response.headers["www-authenticate"] == "Bearer"


def test_api_error_headers_are_sent() -> None:
    response = TestClient(_header_app()).get("/slow-down")
    assert response.headers["retry-after"] == "60"


async def test_an_exception_without_traceback_frames_still_gives_the_500() -> None:
    scope = {"type": "http", "method": "GET", "path": "/boom", "headers": [], "query_string": b""}
    with capture_logs() as logs:
        response = await _unhandled(Request(scope), RuntimeError("never raised"))
    assert response.status_code == 500
    assert response.headers["cache-control"] == "no-store"
    entry = next(entry for entry in logs if entry["event"] == "unhandled_error")
    assert entry["where"] == "unknown"
