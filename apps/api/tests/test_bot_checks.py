from datetime import UTC, datetime

from app.schemas.subscribers import SubscribeRequest
from app.services.bot_checks import automated_reason

NOW = datetime(2026, 12, 1, 12, 0, 0, tzinfo=UTC)
NOW_MS = int(NOW.timestamp() * 1000)


def request(website: str = "", seconds_ago: float = 10) -> SubscribeRequest:
    return SubscribeRequest.model_validate(
        {
            "email": "reader@example.com",
            "source": "landing_hero",
            "consent_text_version": "v1",
            "turnstile_token": "token-from-widget",
            "website": website,
            "rendered_at": NOW_MS - int(seconds_ago * 1000),
        }
    )


def test_a_person_who_took_a_few_seconds_is_not_flagged() -> None:
    assert automated_reason(request(seconds_ago=10), NOW, min_seconds=3) is None


def test_a_filled_hidden_field_is_flagged() -> None:
    assert (
        automated_reason(request(website="http://spam.example"), NOW, min_seconds=3) == "honeypot"
    )


def test_a_form_sent_faster_than_a_person_can_fill_it_is_flagged() -> None:
    assert automated_reason(request(seconds_ago=0.5), NOW, min_seconds=3) == "too_fast"


def test_the_limit_is_inclusive_of_the_minimum() -> None:
    assert automated_reason(request(seconds_ago=3), NOW, min_seconds=3) is None
    assert automated_reason(request(seconds_ago=2.9), NOW, min_seconds=3) == "too_fast"


def test_a_timestamp_in_the_future_is_flagged() -> None:
    assert automated_reason(request(seconds_ago=-60), NOW, min_seconds=3) == "too_fast"


def test_the_honeypot_is_reported_first_when_both_apply() -> None:
    assert automated_reason(request(website="x", seconds_ago=0), NOW, min_seconds=3) == "honeypot"
