"""Got Questions chat endpoint. Nothing is stored and message text is never logged."""

import time
from datetime import UTC, datetime
from functools import cache
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Request

from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import RateLimiter, client_ip, get_rate_limiter
from app.schemas.chat import ChatReply, ChatRequest, ChatTurn
from app.services.chat import Chat
from app.services.kb import get_kb

log = structlog.get_logger()
router = APIRouter(tags=["chat"])


@cache
def _chat() -> Chat | None:
    kb = get_kb()
    return Chat(kb) if kb else None


def get_chat(settings: Annotated[Settings, Depends(get_settings)]) -> Chat:
    """The shared Chat, or a 503 when the flag is off or the knowledge base did not load."""
    chat = _chat() if settings.chat_enabled else None
    if chat is None:
        raise ApiError(503, "chat_unavailable", "Got Questions is not available right now.")
    return chat


@router.post("/chat/messages")
async def chat_message(
    request: Request,
    data: ChatRequest,
    chat: Annotated[Chat, Depends(get_chat)],
    settings: Annotated[Settings, Depends(get_settings)],
    limiter: Annotated[RateLimiter, Depends(get_rate_limiter)],
) -> ChatReply:
    """Answer one turn. A bot (filled honeypot, or sent too fast) gets a plain no-answer reply."""
    started = time.perf_counter()
    await limiter.hit(
        "chat_ip", client_ip(request), settings.chat_limit, settings.chat_window_seconds
    )
    age = datetime.now(UTC).timestamp() - data.rendered_at / 1000
    reason = "honeypot" if data.website else "too_fast" if age < settings.chat_min_seconds else None
    if reason:
        log.info("chat_bot_rejected", reason=reason)
        return chat.no_answer()
    turn = ChatTurn(**data.model_dump(include=set(ChatTurn.model_fields)))
    reply = chat.reply(turn, data.context)
    log.info(
        "chat_reply",
        kind=reply.kind,
        entry_id=reply.entry.id if reply.entry else None,
        latency_ms=round((time.perf_counter() - started) * 1000, 1),
    )
    return reply
