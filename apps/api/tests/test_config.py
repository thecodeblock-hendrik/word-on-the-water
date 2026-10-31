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


def _use_neon(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL")
    monkeypatch.delenv("DATABASE_URL_DIRECT", raising=False)
    monkeypatch.setenv("NEON_PGHOST", "ep-x-pooler.neon.tech")
    monkeypatch.setenv("NEON_PGHOST_UNPOOLED", "ep-x.neon.tech")
    monkeypatch.setenv("NEON_PGDATABASE", "neondb")
    monkeypatch.setenv("DB_RUNTIME_PASSWORD", "runtime-pw")
    monkeypatch.setenv("DB_MIGRATOR_PASSWORD", "migrator-pw")


def test_database_urls_built_from_neon_branch_host(monkeypatch: pytest.MonkeyPatch) -> None:
    _use_neon(monkeypatch)
    settings = Settings(_env_file=None)
    assert settings.database_url.get_secret_value() == (
        "postgresql+asyncpg://app_runtime:runtime-pw@ep-x-pooler.neon.tech/neondb"
    )
    assert settings.database_url_direct is not None
    assert settings.database_url_direct.get_secret_value() == (
        "postgresql+asyncpg://app_migrator:migrator-pw@ep-x.neon.tech/neondb?ssl=verify-full"
    )


def test_explicit_database_url_wins_over_neon(monkeypatch: pytest.MonkeyPatch) -> None:
    _use_neon(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@elsewhere/db")
    assert Settings(_env_file=None).database_url.get_secret_value().endswith("@elsewhere/db")


def test_missing_database_config_fails_fast(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_redis_url_falls_back_to_upstash(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("REDIS_URL")
    monkeypatch.setenv("UPSTASH_REDIS_URL", "rediss://default:t@x.upstash.io:6379")
    assert Settings(_env_file=None).redis_url.get_secret_value().startswith("rediss://")
