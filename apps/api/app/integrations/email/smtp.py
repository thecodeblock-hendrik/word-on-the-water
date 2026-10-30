"""SMTP provider, used with Mailpit locally. Runs the blocking client in a thread."""

import asyncio
import smtplib
from email.message import EmailMessage as MimeMessage

from app.integrations.email.base import EmailMessage, EmailSendError


class SmtpEmailProvider:
    def __init__(self, host: str, port: int, sender: str) -> None:
        self._host = host
        self._port = port
        self._sender = sender

    async def send(self, message: EmailMessage) -> None:
        mime = MimeMessage()
        mime["From"] = self._sender
        mime["To"] = message.to
        mime["Subject"] = message.subject
        mime.set_content(message.text)
        mime.add_alternative(message.html, subtype="html")
        try:
            await asyncio.to_thread(self._send, mime)
        except (OSError, smtplib.SMTPException) as exc:
            raise EmailSendError(f"SMTP send failed: {type(exc).__name__}") from exc

    def _send(self, mime: MimeMessage) -> None:
        with smtplib.SMTP(self._host, self._port, timeout=10) as smtp:
            smtp.send_message(mime)
