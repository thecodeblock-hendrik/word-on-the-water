"""Service-token authentication for the BFF and cron secret for Vercel Cron."""

import hmac
from typing import Annotated

from fastapi import Depends, Header

from app.core.config import Settings, get_settings
from app.core.errors import ApiError


def _check(provided: str | None, expected: str) -> None:
    scheme, _, token = (provided or "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(token.encode(), expected.encode()):
        raise ApiError(401, "unauthorized", "Missing or invalid credentials.")


def require_service_token(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    _check(authorization, settings.service_token.get_secret_value())


def require_cron_secret(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    _check(authorization, settings.cron_secret.get_secret_value())
