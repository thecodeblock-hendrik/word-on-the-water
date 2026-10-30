"""Renders outbox templates into plain-text and mobile-friendly HTML messages."""

from collections.abc import Callable
from html import escape
from typing import Any

from app.integrations.email.base import EmailMessage

Payload = dict[str, Any]


def _greeting(payload: Payload) -> str:
    name = payload.get("first_name")
    return f"Hello {name}," if name else "Hello,"


def _html_page(body: str) -> str:
    return (
        '<!doctype html><html><body style="margin:0;padding:16px;background:#f4f1ea;'
        'font-family:Arial,sans-serif;color:#13293d;">'
        '<div style="max-width:560px;margin:0 auto;background:#fff;padding:24px;'
        f'border-radius:8px;font-size:16px;line-height:1.6;">{body}</div></body></html>'
    )


def _subscribe_confirmation(to: str, payload: Payload) -> EmailMessage:
    url = payload["confirm_url"]
    text = (
        f"{_greeting(payload)}\n\nPlease confirm your email address to receive the "
        f"Word on the Water devotional:\n\n{url}\n\n"
        "If you did not sign up, you can ignore this message."
    )
    name = payload.get("first_name")
    greeting = f"Hello {escape(name)}," if name else "Hello,"
    html = _html_page(
        f"<p>{greeting}</p><p>Please confirm your email address to receive the "
        "Word on the Water devotional.</p>"
        f'<p><a href="{escape(url)}" style="display:inline-block;padding:12px 20px;'
        'background:#1f7a8c;color:#fff;text-decoration:none;border-radius:6px;">'
        "Confirm my email</a></p>"
        "<p>If you did not sign up, you can ignore this message.</p>"
    )
    return EmailMessage(to=to, subject="Confirm your email", text=text, html=html)


TEMPLATES: dict[str, Callable[[str, Payload], EmailMessage]] = {
    "subscribe_confirmation": _subscribe_confirmation,
}


def render(template: str, to: str, payload: Payload) -> EmailMessage:
    try:
        build = TEMPLATES[template]
    except KeyError:
        raise ValueError(f"Unknown email template: {template}") from None
    return build(to, payload)
