"""Outbox writes. Callers enqueue inside their own transaction and commit once."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EmailOutbox


async def enqueue(
    session: AsyncSession, template: str, to_address: str, payload: dict[str, Any]
) -> EmailOutbox:
    """Add a pending email to the session; it is sent only if the caller commits."""
    row = EmailOutbox(template=template, to_address=to_address, payload=payload)
    session.add(row)
    await session.flush()
    return row
