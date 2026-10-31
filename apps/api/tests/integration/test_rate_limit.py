import asyncio
import uuid
from collections.abc import AsyncIterator

import pytest
from redis.asyncio import Redis

from app.core.errors import ApiError
from app.core.rate_limit import RateLimiter, hash_key


async def test_blocks_after_limit_and_scopes_by_subject() -> None:
    redis = Redis.from_url("redis://localhost:6379/0")
    limiter = RateLimiter(redis, "salt")
    subject = uuid.uuid4().hex
    for _ in range(3):
        await limiter.hit("test", subject, limit=3, window_seconds=60)
    with pytest.raises(ApiError) as exc:
        await limiter.hit("test", subject, limit=3, window_seconds=60)
    assert exc.value.status_code == 429
    await limiter.hit("test", uuid.uuid4().hex, limit=3, window_seconds=60)
    await redis.aclose()


@pytest.fixture
async def limiter() -> AsyncIterator[RateLimiter]:
    redis = Redis.from_url("redis://localhost:6379/0")
    yield RateLimiter(redis, "salt")
    await redis.aclose()


async def test_rejected_hit_does_not_extend_the_window(limiter: RateLimiter) -> None:
    subject = uuid.uuid4().hex
    await limiter.hit("test", subject, limit=2, window_seconds=60, now=1000)
    await limiter.hit("test", subject, limit=2, window_seconds=60, now=1000)
    with pytest.raises(ApiError):
        await limiter.hit("test", subject, limit=2, window_seconds=60, now=1030)
    await limiter.hit("test", subject, limit=2, window_seconds=60, now=1061)
    await limiter.hit("test", subject, limit=2, window_seconds=60, now=1062)


async def test_rejected_hit_does_not_extend_the_ttl(limiter: RateLimiter) -> None:
    subject = uuid.uuid4().hex
    key = f"rl:test:{hash_key(subject, 'salt')}"
    for _ in range(2):
        await limiter.hit("test", subject, limit=2, window_seconds=60, now=1000)
    await asyncio.sleep(0.3)
    before = await limiter.redis.pttl(key)
    with pytest.raises(ApiError):
        await limiter.hit("test", subject, limit=2, window_seconds=60, now=1030)
    assert await limiter.redis.pttl(key) <= before


async def test_concurrent_hits_allow_exactly_the_limit(limiter: RateLimiter) -> None:
    subject = uuid.uuid4().hex
    results = await asyncio.gather(
        *(limiter.hit("test", subject, limit=5, window_seconds=60) for _ in range(10)),
        return_exceptions=True,
    )
    assert sum(r is None for r in results) == 5
    assert sum(isinstance(r, ApiError) for r in results) == 5
