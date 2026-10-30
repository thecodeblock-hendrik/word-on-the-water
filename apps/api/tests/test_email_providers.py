import json

import httpx
import pytest

from app.integrations.email.base import EmailMessage, EmailSendError
from app.integrations.email.console import ConsoleEmailProvider
from app.integrations.email.postmark import PostmarkEmailProvider

MESSAGE = EmailMessage(to="a@example.com", subject="Hi", text="plain", html="<p>html</p>")


async def test_postmark_posts_expected_payload() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["token"] = request.headers["x-postmark-server-token"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"ErrorCode": 0})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = PostmarkEmailProvider("tok", "Word <hello@example.com>", client=client)
    await provider.send(MESSAGE)

    assert seen["url"] == "https://api.postmarkapp.com/email"
    assert seen["token"] == "tok"
    assert seen["body"] == {
        "From": "Word <hello@example.com>",
        "To": "a@example.com",
        "Subject": "Hi",
        "TextBody": "plain",
        "HtmlBody": "<p>html</p>",
        "MessageStream": "outbound",
    }


async def test_postmark_error_raises_without_leaking_address() -> None:
    client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(422, json={"Message": "bad"}))
    )
    provider = PostmarkEmailProvider("tok", "hello@example.com", client=client)
    with pytest.raises(EmailSendError) as exc:
        await provider.send(MESSAGE)
    assert "a@example.com" not in str(exc.value)
    assert "422" in str(exc.value)


async def test_console_provider_prints_message(capsys: pytest.CaptureFixture[str]) -> None:
    await ConsoleEmailProvider().send(MESSAGE)
    out = capsys.readouterr().out
    assert "Hi" in out and "plain" in out
