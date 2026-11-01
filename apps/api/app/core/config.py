"""Application settings, loaded from the environment and validated at startup."""

from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import AliasChoices, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    """Required values have no default so a missing secret fails at startup."""

    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env", extra="ignore", env_ignore_empty=True
    )

    environment: Literal["local", "preview", "production"] = "local"
    database_url: SecretStr
    database_url_direct: SecretStr | None = None
    redis_url: SecretStr = Field(validation_alias=AliasChoices("redis_url", "upstash_redis_url"))
    service_token: SecretStr
    cron_secret: SecretStr
    ip_hash_salt: SecretStr
    email_provider: Literal["smtp", "postmark", "console"] = "smtp"
    email_from: str = "Word on the Water <hello@example.invalid>"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    postmark_server_token: SecretStr | None = None
    sentry_dsn: SecretStr | None = None
    neon_pghost: str | None = None
    neon_pghost_unpooled: str | None = None
    neon_pgdatabase: str | None = None
    db_runtime_password: SecretStr | None = None
    db_migrator_password: SecretStr | None = None

    @model_validator(mode="before")
    @classmethod
    def neon_branch_urls(cls, data: dict[str, Any]) -> dict[str, Any]:
        """On Vercel, build URLs from the Neon host of this deployment's branch."""
        host, db = data.get("neon_pghost"), data.get("neon_pgdatabase")
        if host and db and "database_url" not in data and "db_runtime_password" in data:
            password = data["db_runtime_password"]
            data["database_url"] = f"postgresql+asyncpg://app_runtime:{password}@{host}/{db}"
        unpooled = data.get("neon_pghost_unpooled")
        if unpooled and db and "database_url_direct" not in data and "db_migrator_password" in data:
            password = data["db_migrator_password"]
            data["database_url_direct"] = (
                f"postgresql+asyncpg://app_migrator:{password}@{unpooled}/{db}"
            )
        return data

    @property
    def docs_enabled(self) -> bool:
        return self.environment != "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
