"""Integration tests need `make up` and `make migrate` (local docker services)."""

from collections.abc import AsyncIterator

import pytest
from redis.asyncio import Redis
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import get_settings
from app.db.session import get_engine
from app.models import EmailOutbox, Subscriber

RUNTIME_URL = "postgresql+asyncpg://app_runtime:runtime_local@localhost:5432/wotw"
REDIS_URL = "redis://localhost:6379/0"


@pytest.fixture
def local_services(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", RUNTIME_URL)
    monkeypatch.setenv("REDIS_URL", REDIS_URL)
    get_settings.cache_clear()
    get_engine.cache_clear()


@pytest.fixture
async def session(local_services: None) -> AsyncIterator[AsyncSession]:
    """A runtime-role session on clean outbox and subscriber tables."""
    engine = create_async_engine(RUNTIME_URL)
    async with AsyncSession(engine, expire_on_commit=False) as db:
        await db.execute(delete(EmailOutbox))
        await db.execute(delete(Subscriber))
        await db.commit()
        yield db
        await db.rollback()
        await db.execute(delete(EmailOutbox))
        await db.execute(delete(Subscriber))
        await db.commit()
    await engine.dispose()


@pytest.fixture
async def fresh_limits(local_services: None) -> AsyncIterator[None]:
    """Forget rate-limit and idempotency keys, so tests do not count against each other."""
    redis = Redis.from_url(REDIS_URL)
    for pattern in ("rl:*", "idem:*"):
        async for key in redis.scan_iter(pattern):
            await redis.delete(key)
    yield
    await redis.aclose()
