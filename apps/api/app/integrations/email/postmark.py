"""Postmark transactional email over its HTTP API."""

import httpx

from app.integrations.email.base import EmailMessage, EmailSendError

POSTMARK_URL = "https://api.postmarkapp.com/email"


class PostmarkEmailProvider:
    def __init__(
        self, server_token: str, sender: str, client: httpx.AsyncClient | None = None
    ) -> None:
        self._token = server_token
        self._sender = sender
        self._client = client or httpx.AsyncClient(timeout=10)

    async def send(self, message: EmailMessage) -> None:
        response = await self._client.post(
            POSTMARK_URL,
            headers={"X-Postmark-Server-Token": self._token, "Accept": "application/json"},
            json={
                "From": self._sender,
                "To": message.to,
                "Subject": message.subject,
                "TextBody": message.text,
                "HtmlBody": message.html,
                "MessageStream": "outbound",
            },
        )
        if response.status_code != 200:
            raise EmailSendError(
                f"Postmark rejected the message with status {response.status_code}"
            )
