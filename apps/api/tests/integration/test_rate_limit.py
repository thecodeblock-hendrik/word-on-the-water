import uuid

import pytest
from redis.asyncio import Redis

from app.core.errors import ApiError
from app.core.rate_limit import RateLimiter


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
