"""Request ID, no-store caching and request body size limit."""

import uuid
from collections.abc import Awaitable, Callable

import structlog
from fastapi import FastAPI, Request, Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.errors import error_response

MAX_BODY_BYTES = 16 * 1024


class BodyLimitMiddleware:
    """Reject bodies over MAX_BODY_BYTES, counting the bytes actually received.

    The body is read up front (at most MAX_BODY_BYTES) and replayed to the app, so
    the limit holds even for chunked requests and routes that never read the body.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        rejection = self._check_header(scope)
        buffered: list[Message] = []
        if rejection is None:
            rejection = await self._buffer_body(receive, buffered)
        if rejection is not None:
            await rejection(scope, receive, send)
            return
        messages = iter(buffered)

        async def replay() -> Message:
            return next(messages, None) or await receive()

        await self.app(scope, replay, send)

    @staticmethod
    def _check_header(scope: Scope) -> Response | None:
        headers = dict(scope["headers"])
        value = headers.get(b"content-length")
        if value is None:
            return None
        if not value.isdigit():
            return error_response(400, "bad_request", "Invalid Content-Length.")
        if int(value) > MAX_BODY_BYTES:
            return error_response(413, "payload_too_large", "Request body too large.")
        return None

    @staticmethod
    async def _buffer_body(receive: Receive, buffered: list[Message]) -> Response | None:
        total = 0
        while True:
            message = await receive()
            buffered.append(message)
            if message["type"] != "http.request":
                return None
            total += len(message.get("body", b""))
            if total > MAX_BODY_BYTES:
                return error_response(413, "payload_too_large", "Request body too large.")
            if not message.get("more_body", False):
                return None


def register_middleware(app: FastAPI) -> None:
    app.add_middleware(BodyLimitMiddleware)

    @app.middleware("http")
    async def request_context(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = uuid.uuid4().hex
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["Cache-Control"] = "no-store"
        return response
