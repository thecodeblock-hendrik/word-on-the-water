import pytest

from app.core.config import get_settings


@pytest.fixture(autouse=True)
def settings_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost/db")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("SERVICE_TOKEN", "test-service-token")
    monkeypatch.setenv("CRON_SECRET", "test-cron-secret")
    get_settings.cache_clear()
