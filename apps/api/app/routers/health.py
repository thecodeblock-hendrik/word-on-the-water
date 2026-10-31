from typing import Annotated

import structlog
from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.rate_limit import get_redis
from app.db.session import get_session

router = APIRouter(prefix="/health", tags=["health"])
log = structlog.get_logger()


@router.get("/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def ready(
    session: Annotated[AsyncSession, Depends(get_session)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> dict[str, str]:
    """Readiness checks the database and Redis; failures return a generic 503."""
    # Only the exception type is logged: messages can contain hosts or credentials.
    dependency = "database"
    try:
        await session.execute(text("SELECT 1"))
        dependency = "redis"
        await redis.ping()
    except Exception as exc:
        log.warning("readiness_failed", dependency=dependency, error=type(exc).__name__)
        raise ApiError(503, "not_ready", "A dependency is unavailable.") from exc
    return {"status": "ok"}
