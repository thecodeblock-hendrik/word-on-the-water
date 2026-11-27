import functools
import logging
from collections.abc import Iterator
from dataclasses import dataclass, field

import pytest
import sentry_sdk
from pydantic import SecretStr
from sentry_sdk.envelope import Envelope
from sentry_sdk.transport import Transport

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


def test_init_without_dsn_does_nothing() -> None:
    settings = Settings.model_construct(sentry_dsn=None, environment="local")
    init_sentry(settings)
    assert not sentry_sdk.is_initialized()


def test_local_variables_and_log_parameters_are_scrubbed_from_every_part_of_an_event() -> None:
    event = {
        "threads": {"values": [{"stacktrace": {"frames": [{"vars": {"body": PRAYER}}]}}]},
        "logentry": {
            "message": f"failed for {EMAIL} %s",
            "formatted": f"failed for {EMAIL} {EMAIL}",
            "params": [EMAIL],
        },
    }
    out = scrub_event(event, {})
    assert out is not None
    assert PRAYER not in str(out) and EMAIL not in str(out)
    assert out["logentry"]["formatted"] == "failed for [email] [email]"


@dataclass
class Sent:
    """What left the process: the kind of each envelope item and its text."""

    items: list[tuple[str, str]] = field(default_factory=list)

    def events(self) -> list[str]:
        return [text for kind, text in self.items if kind == "event"]

    def text(self) -> str:
        return "".join(text for _, text in self.items)


@pytest.fixture
def sent(monkeypatch: pytest.MonkeyPatch) -> Iterator[Sent]:
    """Sentry started the way the app starts it, with a transport that keeps what it is given."""
    out = Sent()

    class Capture(Transport):
        def capture_envelope(self, envelope: Envelope) -> None:
            out.items += [(i.type or "", i.get_bytes().decode()) for i in envelope.items]

    monkeypatch.setattr(sentry_sdk, "init", functools.partial(sentry_sdk.init, transport=Capture))
    dsn = SecretStr("https://k@o0.ingest.sentry.io/1")
    init_sentry(Settings.model_construct(sentry_dsn=dsn, environment="local"))
    yield out
    sentry_sdk.get_client().close()


def secret() -> str:
    """A marker built at run time: Sentry sends nearby source lines, so a literal could match."""
    return "-".join(["LOCAL", "SECRET"])


def test_a_crash_sent_through_the_sdk_arrives_scrubbed(sent: Sent) -> None:
    def fail() -> None:
        prayer = secret()  # noqa: F841
        raise ValueError(f"could not email {EMAIL}")

    try:
        fail()
    except ValueError as exc:
        sentry_sdk.capture_exception(exc)
    sentry_sdk.flush()

    assert "ValueError" in sent.text()
    assert EMAIL not in sent.text() and secret() not in sent.text()


def test_a_message_carries_no_stack_and_no_local_variables(sent: Sent) -> None:
    def alert() -> None:
        prayer = secret()  # noqa: F841
        sentry_sdk.capture_message("Outbox messages failed for good", level="error")

    alert()
    sentry_sdk.flush()

    (event,) = sent.events()
    assert "stacktrace" not in event
    assert secret() not in event


def test_a_logged_error_is_still_reported_with_the_address_masked(sent: Sent) -> None:
    logging.getLogger("some.library").error("database failed for %s", EMAIL)
    sentry_sdk.flush()

    (event,) = sent.events()
    assert "database failed for [email]" in event
    assert EMAIL not in sent.text()


def test_log_lines_are_not_shipped_to_sentry_as_logs(sent: Sent) -> None:
    logger = logging.getLogger("some.library")
    logger.warning("warning for %s", EMAIL)
    logger.error("error for %s", EMAIL)
    sentry_sdk.flush()
    sentry_sdk.get_client().close()

    assert {kind for kind, _ in sent.items} <= {"event", "sessions", "client_report"}
