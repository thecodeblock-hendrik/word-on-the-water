"""Email provider interface. Implementations are swappable and faked in tests."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    text: str
    html: str


class EmailSendError(Exception):
    """Raised when a provider fails. The message must never contain addresses or content."""


class EmailProvider(Protocol):
    async def send(self, message: EmailMessage) -> None: ...
