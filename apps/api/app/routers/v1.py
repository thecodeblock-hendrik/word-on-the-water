"""Versioned API. Every route here requires the service token (default deny)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.subscribers import SubscribeRequest, SubscribeResponse
from app.services.subscribers import request_subscription

router = APIRouter(tags=["v1"])


@router.get("/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/subscribers", status_code=202)
async def subscribe(
    data: SubscribeRequest, session: Annotated[AsyncSession, Depends(get_session)]
) -> SubscribeResponse:
    """Always 202 with the same body, whether the address is new, pending or confirmed."""
    await request_subscription(session, data)
    return SubscribeResponse()
