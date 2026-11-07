import uuid

import pytest
from redis.asyncio import Redis

from app.services.idempotency import IdempotencyStore

pytestmark = pytest.mark.usefixtures("fresh_limits")


def store(redis: Redis) -> IdempotencyStore:
    return IdempotencyStore(redis, "salt")


async def test_the_first_claim_wins_and_a_repeat_is_refused() -> None:
    redis = Redis.from_url("redis://localhost:6379/0")
    key = uuid.uuid4().hex
    assert await store(redis).claim("signup", key) is True
    assert await store(redis).claim("signup", key) is False
    await redis.aclose()


async def test_a_released_claim_can_be_made_again() -> None:
    redis = Redis.from_url("redis://localhost:6379/0")
    key = uuid.uuid4().hex
    await store(redis).claim("signup", key)
    await store(redis).release("signup", key)
    assert await store(redis).claim("signup", key) is True
    await redis.aclose()


async def test_a_completed_claim_stays_for_a_day_not_a_minute() -> None:
    redis = Redis.from_url("redis://localhost:6379/0")
    key = uuid.uuid4().hex
    await store(redis).claim("signup", key)
    stored_key = f"idem:{await _only_key(redis)}"
    assert 0 < await redis.ttl(stored_key) <= 60
    await store(redis).complete("signup", key)
    assert 60 < await redis.ttl(stored_key) <= 86_400
    await redis.aclose()


async def test_the_same_key_in_another_scope_is_a_different_claim() -> None:
    redis = Redis.from_url("redis://localhost:6379/0")
    key = uuid.uuid4().hex
    assert await store(redis).claim("signup", key) is True
    assert await store(redis).claim("contact", key) is True
    await redis.aclose()


async def test_the_key_is_never_stored_in_the_clear() -> None:
    redis = Redis.from_url("redis://localhost:6379/0")
    marker = "plainly-readable-marker"
    await store(redis).claim("signup", marker)
    assert marker not in await _only_key(redis)
    await redis.aclose()


async def _only_key(redis: Redis) -> str:
    keys = [k.decode() async for k in redis.scan_iter("idem:*")]
    assert len(keys) == 1
    return str(keys[0]).removeprefix("idem:")
