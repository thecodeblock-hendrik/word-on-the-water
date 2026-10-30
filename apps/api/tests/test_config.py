import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_missing_secret_fails_fast(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SERVICE_TOKEN")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_docs_disabled_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    assert Settings(_env_file=None).docs_enabled is False
