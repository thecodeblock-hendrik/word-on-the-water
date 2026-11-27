"""Sentry error reporting. Events are scrubbed so no personal data or prayer text leaves."""

import logging
import re
from typing import Any, cast

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

from app.core.config import Settings

_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
_DROPPED_REQUEST_KEYS = ("data", "cookies", "query_string")
_KEPT_HEADERS = {"accept", "content-type", "user-agent"}


def _mask(text: str) -> str:
    return _EMAIL.sub("[email]", text)


def _scrub_request(request: dict[str, Any]) -> None:
    for key in _DROPPED_REQUEST_KEYS:
        request.pop(key, None)
    headers = request.get("headers", {})
    request["headers"] = {k: v for k, v in headers.items() if k.lower() in _KEPT_HEADERS}


def _scrub_stacks(event: dict[str, Any]) -> None:
    """Drop local variables from exception and thread stacks, and mask exception messages."""
    exceptions = event.get("exception", {}).get("values", [])
    threads = event.get("threads", {}).get("values", [])
    for value in [*exceptions, *threads]:
        for frame in (value.get("stacktrace") or {}).get("frames", []):
            frame.pop("vars", None)
    for exc in exceptions:
        if "value" in exc:
            exc["value"] = _mask(exc["value"])


def _scrub_log_entry(entry: dict[str, Any]) -> None:
    """An event made from a log line: mask its text and drop the raw arguments."""
    entry.pop("params", None)
    for key in ("message", "formatted"):
        if key in entry:
            entry[key] = _mask(entry[key])


def scrub_event(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    """Sentry before_send: drop bodies, cookies, auth headers, locals and email addresses."""
    if "request" in event:
        _scrub_request(event["request"])
    event.pop("user", None)
    if "message" in event:
        event["message"] = _mask(event["message"])
    _scrub_stacks(event)
    if "logentry" in event:
        _scrub_log_entry(event["logentry"])
    for crumb in event.get("breadcrumbs", {}).get("values", []):
        if "message" in crumb:
            crumb["message"] = _mask(crumb["message"])
        crumb.pop("data", None)
    return event


def init_sentry(settings: Settings) -> None:
    """Start Sentry when a DSN is configured; otherwise do nothing."""
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn.get_secret_value(),
        environment=settings.environment,
        data_collection={"user_info": False, "http_bodies": [], "stack_frame_variables": False},
        # Error logs become Sentry issues and lower levels become breadcrumbs. level=None keeps
        # log lines from being sent as Sentry logs, which before_send would never see.
        integrations=[LoggingIntegration(level=None, event_level=logging.ERROR)],
        attach_stacktrace=False,
        max_request_body_size="never",
        before_send=cast(Any, scrub_event),
    )
