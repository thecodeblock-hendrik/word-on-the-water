"""Sliding-window rate limiting in Redis, keyed by hashed client IP or email."""

import hashlib
import hmac
import time
import uuid
from typing import Annotated

from fastapi import Depends, Request
from redis.asyncio import Redis

from app.core.config import Settings, get_settings
from app.core.errors import ApiError


def client_ip(request: Request) -> str:
    """Use only headers set by Vercel; a client-supplied header is never trusted."""
    for header in ("x-real-ip", "x-vercel-forwarded-for"):
        if value := request.headers.get(header):
            return value.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def hash_key(value: str, salt: str) -> str:
    return hmac.new(salt.encode(), value.lower().encode(), hashlib.sha256).hexdigest()


class RateLimiter:
    def __init__(self, redis: Redis, salt: str) -> None:
        self.redis = redis
        self.salt = salt

    async def hit(self, scope: str, subject: str, limit: int, window_seconds: int) -> None:
        """Record a hit and raise a generic 429 when the window is full."""
        key = f"rl:{scope}:{hash_key(subject, self.salt)}"
        now = time.time()
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.zremrangebyscore(key, 0, now - window_seconds)
            pipe.zadd(key, {uuid.uuid4().hex: now})
            pipe.zcard(key)
            pipe.expire(key, window_seconds)
            _, _, count, _ = await pipe.execute()
        if count > limit:
            raise ApiError(429, "rate_limited", "Too many requests. Please try again later.")


def get_redis(settings: Annotated[Settings, Depends(get_settings)]) -> Redis:
    return Redis.from_url(settings.redis_url.get_secret_value())
