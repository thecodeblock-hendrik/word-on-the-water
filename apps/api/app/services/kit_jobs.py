"""The outbox job that signs a person up in Kit: create as inactive, add to the opt-in form."""

from urllib.parse import urlencode

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.kit.client import KitClient
from app.models import EmailOutbox, Subscriber

KIT_SUBSCRIBE = "kit_subscribe"


class KitSubscribeJob:
    def __init__(self, client: KitClient, site_url: str) -> None:
        self._client = client
        self._site_url = site_url.rstrip("/")

    def _referrer(self, source: str, consent_text_version: str) -> str:
        """The address Kit records for the sign-up: where it came from and the consent version."""
        return f"{self._site_url}/?{urlencode({'source': source, 'consent': consent_text_version})}"

    async def run(self, session: AsyncSession, row: EmailOutbox) -> None:
        """Sign the person up and keep Kit's id on our mirror row. Raises KitError to be retried."""
        payload = row.payload
        referrer = self._referrer(payload["source"], payload["consent_text_version"])
        kit_id = await self._client.subscribe(row.to_address, payload.get("first_name"), referrer)
        await session.execute(
            update(Subscriber)
            .where(Subscriber.email == row.to_address)
            .values(kit_subscriber_id=kit_id)
        )
