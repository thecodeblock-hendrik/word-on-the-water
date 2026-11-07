"""Request and response bodies for the subscriber endpoints."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

Label = Annotated[str, StringConstraints(pattern=r"^[a-z0-9_]+$")]


class SubscribeRequest(BaseModel):
    """A sign-up. Strict: unknown fields are an error and every length is capped."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: Annotated[EmailStr, Field(max_length=254)]
    first_name: Annotated[str | None, Field(max_length=80)] = None
    source: Annotated[Label, Field(min_length=1, max_length=40)]
    consent_text_version: Annotated[str, Field(min_length=1, max_length=20)]
    # A hidden field no person sees: bots fill it. Capped so nobody posts a huge value.
    website: Annotated[str, Field(max_length=1000)] = ""
    # When the form was rendered (milliseconds since 1970): a form sent too fast is a bot.
    rendered_at: Annotated[int, Field(strict=True, ge=0)]
    # The Cloudflare Turnstile token from the widget; the server checks it with Cloudflare.
    turnstile_token: Annotated[str, Field(min_length=1, max_length=2048)]

    @field_validator("first_name")
    @classmethod
    def blank_means_none(cls, value: str | None) -> str | None:
        return value or None


class SubscribeResponse(BaseModel):
    """One answer for a new, a pending and a confirmed address, so nobody can probe the list."""

    status: Literal["check_your_inbox"] = "check_your_inbox"
