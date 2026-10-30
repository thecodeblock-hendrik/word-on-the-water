"""Integration tests need `make up` and `make migrate` (local docker services)."""

import pytest

from app.core.config import get_settings
from app.db.session import get_engine

RUNTIME_URL = "postgresql+asyncpg://app_runtime:runtime_local@localhost:5432/wotw"
REDIS_URL = "redis://localhost:6379/0"


@pytest.fixture
def local_services(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", RUNTIME_URL)
    monkeypatch.setenv("REDIS_URL", REDIS_URL)
    get_settings.cache_clear()
    get_engine.cache_clear()
