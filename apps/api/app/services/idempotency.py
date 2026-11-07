"""Idempotency keys: a repeated request with the same key does its work only once.

Form posts on a flaky phone connection are often sent twice. The first attempt claims the key for
a minute while it works; once it succeeds the claim is kept for a day, and a failed attempt gives
the key back so the visitor can retry. Keys are stored only as salted hashes.
"""

from redis.asyncio import Redis

from app.core.rate_limit import hash_key

IN_FLIGHT_SECONDS = 60
DONE_SECONDS = 24 * 60 * 60


class IdempotencyStore:
    def __init__(self, redis: Redis, salt: str) -> None:
        self._redis = redis
        self._salt = salt

    def _name(self, scope: str, key: str) -> str:
        return f"idem:{hash_key(f'{scope}:{key}', self._salt)}"

    async def claim(self, scope: str, key: str) -> bool:
        """True if this is the first request with the key; False for a repeat."""
        return bool(
            await self._redis.set(self._name(scope, key), "1", nx=True, ex=IN_FLIGHT_SECONDS)
        )

    async def complete(self, scope: str, key: str) -> None:
        await self._redis.expire(self._name(scope, key), DONE_SECONDS)

    async def release(self, scope: str, key: str) -> None:
        await self._redis.delete(self._name(scope, key))
