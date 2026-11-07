"""Cheap checks that catch simple bots on the sign-up form. Turnstile is the stronger check."""

from datetime import datetime

from app.schemas.subscribers import SubscribeRequest


def automated_reason(data: SubscribeRequest, now: datetime, min_seconds: float) -> str | None:
    """Why this request looks automated, or None.

    A person leaves the hidden field empty and needs a few seconds to fill the form in. A time
    in the future counts as too fast, so a forged timestamp cannot help a bot.
    """
    if data.website:
        return "honeypot"
    elapsed = now.timestamp() - data.rendered_at / 1000
    return "too_fast" if elapsed < min_seconds else None
