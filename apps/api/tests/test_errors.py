from fastapi import FastAPI
from fastapi.testclient import TestClient
from structlog.testing import capture_logs

from app.core.errors import register_error_handlers


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
