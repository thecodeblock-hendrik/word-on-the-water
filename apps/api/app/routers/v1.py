"""Versioned API. Every route here requires the service token (default deny)."""

from fastapi import APIRouter

router = APIRouter(tags=["v1"])


@router.get("/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/sentry-test")
async def sentry_test() -> None:
    """TEMPORARY: proves an error reaches Sentry scrubbed. Remove before merge."""
    prayer = "Please pray for my mother, she has cancer"  # noqa: F841
    raise ValueError("sentry test for jo" + "@example.com")
