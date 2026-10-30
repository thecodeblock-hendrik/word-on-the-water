"""Application settings, loaded from the environment and validated at startup."""

from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Required values have no default so a missing secret fails at startup."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["local", "preview", "production"] = "local"
    database_url: SecretStr
    redis_url: SecretStr
    service_token: SecretStr
    cron_secret: SecretStr
    ip_hash_salt: SecretStr

    @property
    def docs_enabled(self) -> bool:
        return self.environment != "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
