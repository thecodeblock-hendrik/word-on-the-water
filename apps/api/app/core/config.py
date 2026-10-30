"""Application settings, loaded from the environment and validated at startup."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
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
    redis_url: SecretStr
    service_token: SecretStr
    cron_secret: SecretStr
    ip_hash_salt: SecretStr
    email_provider: Literal["smtp", "postmark", "console"] = "smtp"
    email_from: str = "Word on the Water <hello@example.invalid>"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    postmark_server_token: SecretStr | None = None

    @property
    def docs_enabled(self) -> bool:
        return self.environment != "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
