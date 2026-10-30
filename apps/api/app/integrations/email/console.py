"""Prints messages to stdout. Local development only (the factory enforces this)."""

from app.integrations.email.base import EmailMessage


class ConsoleEmailProvider:
    async def send(self, message: EmailMessage) -> None:
        print(f"To: {message.to}\nSubject: {message.subject}\n\n{message.text}")  # noqa: T201
