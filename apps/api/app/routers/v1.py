"""Versioned API. Every route here requires the service token (default deny)."""

from fastapi import APIRouter

router = APIRouter(tags=["v1"])


@router.get("/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}
