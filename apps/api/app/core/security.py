"""Service-token authentication for the BFF and cron secret for Vercel Cron."""

import contextlib
import hmac
import ipaddress
from typing import Annotated

from fastapi import Depends, Header, Request

from app.core.config import Settings, get_settings
from app.core.errors import ApiError


def _check(provided: str | None, expected: str) -> None:
    scheme, _, token = (provided or "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(token.encode(), expected.encode()):
        raise ApiError(401, "unauthorized", "Missing or invalid credentials.")


def require_service_token(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """Check the token, then trust the BFF's X-Client-IP (only a valid caller can set it)."""
    _check(authorization, settings.service_token.get_secret_value())
    claimed = request.headers.get("x-client-ip", "").strip()
    with contextlib.suppress(ValueError):
        request.state.client_ip = str(ipaddress.ip_address(claimed))


def require_cron_secret(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    _check(authorization, settings.cron_secret.get_secret_value())
