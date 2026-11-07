"""What Kit sends to a webhook endpoint (https://developers.kit.com/webhooks/delivery-format).

Lenient on purpose: this is another company's format, so fields we do not use are ignored and a
new one never breaks us. A delivery holds 1 to 100 events of one type.
"""

from pydantic import BaseModel, ConfigDict, Field


class KitSubscriber(BaseModel):
    id: int
    email_address: str
    state: str | None = None


class KitEventData(BaseModel):
    subscriber: KitSubscriber | None = None


class KitEvent(BaseModel):
    """`id` stays the same if Kit re-sends the event, so it is what we deduplicate on."""

    id: str = Field(min_length=1, max_length=64)
    type: str = Field(min_length=1, max_length=64)
    data: KitEventData = KitEventData()


class KitDelivery(BaseModel):
    model_config = ConfigDict(extra="ignore")

    events: list[KitEvent] = Field(max_length=100)
