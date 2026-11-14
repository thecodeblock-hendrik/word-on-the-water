"""Kit (kit.com) API v4: the calls that start a double opt-in sign-up and create a broadcast draft.

A subscriber created without a state is active at once, which would skip the confirmation, so it
is created as inactive. Adding it to the double opt-in form makes Kit send the confirmation email
(proven in the 1.3 spike, see docs/adr/0008-kit-subscriptions.md).

Broadcasts are only ever created as drafts; a person schedules them in Kit (2.4 spike, same ADR).
"""

from typing import Any

import httpx

KIT_URL = "https://api.kit.com/v4"


class KitError(Exception):
    """Raised when Kit refuses a call. The message must never contain an address or the key."""


class KitRateLimitedError(KitError):
    """Kit allows 120 requests a minute per key. The caller retries later."""


class KitClient:
    def __init__(self, api_key: str, form_id: int, client: httpx.AsyncClient | None = None) -> None:
        self._api_key = api_key
        self._form_id = form_id
        self._client = client or httpx.AsyncClient(timeout=10)

    async def subscribe(self, email: str, first_name: str | None, referrer: str) -> int:
        """Start a sign-up. Safe to repeat: Kit upserts the subscriber and accepts a second add."""
        subscriber_id = await self.create_subscriber(email, first_name)
        await self.add_to_form(subscriber_id, referrer)
        return subscriber_id

    async def create_subscriber(self, email: str, first_name: str | None) -> int:
        payload: dict[str, str] = {"email_address": email, "state": "inactive"}
        if first_name:
            payload["first_name"] = first_name
        data = await self._post("/subscribers", payload)
        return int(data["subscriber"]["id"])

    async def add_to_form(self, subscriber_id: int, referrer: str) -> None:
        await self._post(
            f"/forms/{self._form_id}/subscribers/{subscriber_id}", {"referrer": referrer}
        )

    async def create_broadcast(
        self,
        *,
        subject: str,
        preview_text: str,
        description: str,
        content: str,
        email_address: str,
        tag_id: int | None,
    ) -> int:
        """Create a draft broadcast and return its id. It is never scheduled and never public.

        Kit fills in anything left out (sender, template and an audience of all subscribers), and an
        update resets what it does not carry, so every field is sent. `tag_id` is required: pass
        None only to mean all subscribers on purpose.
        """
        audience = (
            {"type": "all_subscribers"} if tag_id is None else {"type": "tag", "ids": [tag_id]}
        )
        data = await self._post(
            "/broadcasts",
            {
                "subject": subject,
                "preview_text": preview_text,
                "description": description,
                "content": content,
                "email_address": email_address,
                "public": False,
                "send_at": None,
                "subscriber_filter": [{"all": [audience]}],
            },
        )
        return int(data["broadcast"]["id"])

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = await self._client.post(
            KIT_URL + path,
            headers={"X-Kit-Api-Key": self._api_key, "Accept": "application/json"},
            json=payload,
        )
        if response.status_code == 429:
            raise KitRateLimitedError("Kit is rate limiting this key (status 429)")
        if response.status_code not in (200, 201):
            raise KitError(f"Kit rejected the call with status {response.status_code}")
        return response.json()  # type: ignore[no-any-return]
