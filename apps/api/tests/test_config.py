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


def test_blank_env_values_use_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SMTP_PORT", "")
    assert Settings(_env_file=None).smtp_port == 1025


def test_blank_required_secret_still_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SERVICE_TOKEN", "")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
