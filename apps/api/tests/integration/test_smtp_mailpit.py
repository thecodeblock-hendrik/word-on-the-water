import uuid

import httpx
import pytest

from app.integrations.email.base import EmailMessage, EmailSendError
from app.integrations.email.smtp import SmtpEmailProvider

MAILPIT_API = "http://localhost:8025/api/v1"


async def test_message_arrives_in_mailpit() -> None:
    subject = f"smtp test {uuid.uuid4().hex}"
    provider = SmtpEmailProvider("localhost", 1025, "Word <hello@example.com>")
    await provider.send(
        EmailMessage(to="reader@example.com", subject=subject, text="plain body", html="<p>hi</p>")
    )

    async with httpx.AsyncClient() as client:
        found = (await client.get(f"{MAILPIT_API}/search", params={"query": subject})).json()
        assert found["messages_count"] == 1
        message = (await client.get(f"{MAILPIT_API}/message/{found['messages'][0]['ID']}")).json()
    assert message["Text"].strip() == "plain body"
    assert message["HTML"].strip() == "<p>hi</p>"
    assert message["To"][0]["Address"] == "reader@example.com"


async def test_unreachable_server_raises_send_error() -> None:
    provider = SmtpEmailProvider("localhost", 1, "hello@example.com")
    with pytest.raises(EmailSendError) as exc:
        await provider.send(EmailMessage(to="x@example.com", subject="s", text="t", html="h"))
    assert "x@example.com" not in str(exc.value)
