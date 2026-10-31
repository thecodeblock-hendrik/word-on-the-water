"""Sliding-window rate limiting in Redis, keyed by hashed client IP or email."""

import hashlib
import hmac
import time
import uuid
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from redis.asyncio import Redis

from app.core.config import Settings, get_settings
from app.core.errors import ApiError


def client_ip(request: Request) -> str:
    """The BFF's client IP once the service token passed, else headers set by Vercel.

    Behind the BFF, Vercel's own headers carry the web function's address, not the visitor's
    (proved on a preview deployment), so the BFF sends X-Client-IP. A client-supplied header is
    never trusted without a valid service token.
    """
    if bff_ip := getattr(request.state, "client_ip", None):
        return str(bff_ip)
    for header in ("x-real-ip", "x-vercel-forwarded-for"):
        if value := request.headers.get(header):
            return value.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def hash_key(value: str, salt: str) -> str:
    return hmac.new(salt.encode(), value.lower().encode(), hashlib.sha256).hexdigest()


# Count the window first and record the hit only when allowed, atomically.
_HIT_SCRIPT = """
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1] - ARGV[2])
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[3]) then
  return 0
end
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[4])
redis.call('EXPIRE', KEYS[1], ARGV[2])
return 1
"""


class RateLimiter:
    def __init__(self, redis: Redis, salt: str) -> None:
        self.redis = redis
        self.salt = salt

    async def hit(
        self, scope: str, subject: str, limit: int, window_seconds: int, now: float | None = None
    ) -> None:
        """Record a hit and raise a generic 429 when the window is full.

        Rejected hits are not recorded, so they never extend the window.
        """
        key = f"rl:{scope}:{hash_key(subject, self.salt)}"
        now = time.time() if now is None else now
        allowed = await self.redis.eval(
            _HIT_SCRIPT, 1, key, now, window_seconds, limit, uuid.uuid4().hex
        )
        if not allowed:
            raise ApiError(429, "rate_limited", "Too many requests. Please try again later.")


async def get_redis(settings: Annotated[Settings, Depends(get_settings)]) -> AsyncIterator[Redis]:
    redis = Redis.from_url(settings.redis_url.get_secret_value(), socket_connect_timeout=2)
    try:
        yield redis
    finally:
        await redis.aclose()
