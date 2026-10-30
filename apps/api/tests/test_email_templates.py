import pytest

from app.services.email_templates import render

PAYLOAD = {"first_name": "Sam", "confirm_url": "https://example.com/subscribe/confirm?token=abc"}


def test_subscribe_confirmation_has_text_and_html_with_link() -> None:
    message = render("subscribe_confirmation", "a@example.com", PAYLOAD)
    assert message.to == "a@example.com"
    assert "confirm" in message.subject.lower()
    assert PAYLOAD["confirm_url"] in message.text
    assert f'href="{PAYLOAD["confirm_url"]}"' in message.html
    assert "Sam" in message.text and "Sam" in message.html


def test_name_is_html_escaped() -> None:
    payload = {**PAYLOAD, "first_name": "<script>alert(1)</script>"}
    message = render("subscribe_confirmation", "a@example.com", payload)
    assert "<script>" not in message.html
    assert "&lt;script&gt;" in message.html


def test_missing_name_still_renders() -> None:
    payload = {"confirm_url": PAYLOAD["confirm_url"]}
    message = render("subscribe_confirmation", "a@example.com", payload)
    assert message.text.startswith("Hello,")


def test_unknown_template_raises() -> None:
    with pytest.raises(ValueError, match="Unknown email template"):
        render("nope", "a@example.com", {})
