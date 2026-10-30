"""Async engine for Neon's pooled endpoint. NullPool lets PgBouncer do the pooling."""

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import get_settings


@lru_cache
def get_engine() -> AsyncEngine:
    settings = get_settings()
    return create_async_engine(
        settings.database_url.get_secret_value(),
        poolclass=NullPool,
        connect_args={
            "timeout": 5,
            "command_timeout": 10,
            "ssl": False if settings.environment == "local" else "verify-full",
            "statement_cache_size": 0,
        },
    )


async def get_session() -> AsyncIterator[AsyncSession]:
    async with async_sessionmaker(get_engine(), expire_on_commit=False)() as session:
        yield session
