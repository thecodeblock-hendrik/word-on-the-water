import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.core.observability import init_sentry, scrub_event

PRAYER = "Please pray for my mother, she has cancer"
EMAIL = "jo" + "@example.com"


def test_request_body_cookies_and_auth_are_removed() -> None:
    event = {
        "request": {
            "data": {"body": PRAYER, "email": "a@b.com"},
            "cookies": {"session": "x"},
            "query_string": "email=a@b.com",
            "headers": {"Authorization": "Bearer s", "X-Client-IP": "1.2.3.4", "Accept": "json"},
        },
        "user": {"ip_address": "1.2.3.4"},
    }
    out = scrub_event(event, {})
    assert out is not None
    request = out["request"]
    assert "data" not in request and "cookies" not in request and "query_string" not in request
    assert request["headers"] == {"Accept": "json"}
    assert "user" not in out


def test_emails_are_masked_in_messages_exceptions_and_breadcrumbs() -> None:
    event = {
        "message": "failed for jo@example.com",
        "exception": {"values": [{"type": "ValueError", "value": "bad jo@example.com"}]},
        "breadcrumbs": {"values": [{"message": "sent to jo@example.com"}]},
    }
    out = scrub_event(event, {})
    assert out is not None
    assert "jo@example.com" not in str(out)
    assert "[email]" in out["message"]


def test_local_variables_are_dropped_from_stack_frames() -> None:
    event = {
        "exception": {
            "values": [{"stacktrace": {"frames": [{"vars": {"body": PRAYER}, "function": "f"}]}}]
        }
    }
    out = scrub_event(event, {})
    assert out is not None
    assert PRAYER not in str(out)


def test_init_without_dsn_does_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    import sentry_sdk

    settings = Settings.model_construct(sentry_dsn=None, environment="local")
    init_sentry(settings)
    assert not sentry_sdk.is_initialized()


def test_event_sent_through_the_sdk_arrives_scrubbed(monkeypatch: pytest.MonkeyPatch) -> None:
    import functools

    import sentry_sdk
    from sentry_sdk.envelope import Envelope
    from sentry_sdk.transport import Transport

    sent: list[bytes] = []

    class Capture(Transport):
        def capture_envelope(self, envelope: Envelope) -> None:
            sent.append(envelope.serialize())

    monkeypatch.setattr(sentry_sdk, "init", functools.partial(sentry_sdk.init, transport=Capture))
    dsn = SecretStr("https://k@o0.ingest.sentry.io/1")
    settings = Settings.model_construct(sentry_dsn=dsn, environment="local")
    init_sentry(settings)

    def fail() -> None:
        prayer = PRAYER  # noqa: F841
        raise ValueError(f"could not email {EMAIL}")

    try:
        fail()
    except ValueError as exc:
        sentry_sdk.capture_exception(exc)
    sentry_sdk.flush()
    sentry_sdk.get_client().close()

    payload = b"".join(sent).decode()
    assert "ValueError" in payload
    assert EMAIL not in payload and PRAYER not in payload
