"""Async engine for Neon's pooled endpoint. NullPool lets PgBouncer do the pooling."""

import ssl
from collections.abc import AsyncIterator
from functools import lru_cache

import certifi
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import get_settings


def tls_for(environment: str) -> ssl.SSLContext | bool:
    """Verify the server certificate and hostname (verify-full) everywhere but local.

    An SSLContext, not the string "verify-full": asyncpg then looks for ~/.postgresql/root.crt.
    certifi's CA bundle, because uv's standalone Python has no system CA store.
    """
    return False if environment == "local" else ssl.create_default_context(cafile=certifi.where())


@lru_cache
def get_engine() -> AsyncEngine:
    settings = get_settings()
    return create_async_engine(
        settings.database_url.get_secret_value(),
        poolclass=NullPool,
        connect_args={
            "timeout": 5,
            "command_timeout": 10,
            "ssl": tls_for(settings.environment),
            "statement_cache_size": 0,
        },
    )


async def get_session() -> AsyncIterator[AsyncSession]:
    async with async_sessionmaker(get_engine(), expire_on_commit=False)() as session:
        yield session
