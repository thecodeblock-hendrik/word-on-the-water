import pytest
from pydantic import ValidationError

from app.schemas.subscribers import SubscribeRequest, SubscribeResponse

VALID = {
    "email": "reader@example.com",
    "first_name": "Ann",
    "source": "landing_hero",
    "consent_text_version": "v1",
    "rendered_at": 1_790_000_000_000,
}


def test_a_valid_request_is_accepted() -> None:
    request = SubscribeRequest.model_validate(VALID)
    assert (request.email, request.first_name) == ("reader@example.com", "Ann")


def test_the_first_name_is_optional_and_blank_means_none() -> None:
    without = {k: v for k, v in VALID.items() if k != "first_name"}
    assert SubscribeRequest.model_validate(without).first_name is None
    assert SubscribeRequest.model_validate({**VALID, "first_name": "   "}).first_name is None


def test_whitespace_around_the_values_is_removed() -> None:
    request = SubscribeRequest.model_validate(
        {**VALID, "email": " reader@example.com ", "first_name": " Ann "}
    )
    assert (request.email, request.first_name) == ("reader@example.com", "Ann")


def test_unknown_fields_are_rejected() -> None:
    with pytest.raises(ValidationError):
        SubscribeRequest.model_validate({**VALID, "admin": True})


@pytest.mark.parametrize(
    "email", ["", "not-an-email", "a@b", "two@@example.com", "a b@example.com"]
)
def test_a_bad_email_is_rejected(email: str) -> None:
    with pytest.raises(ValidationError):
        SubscribeRequest.model_validate({**VALID, "email": email})


def test_the_email_may_be_254_characters_and_not_more() -> None:
    domain = "@" + "d" * 60 + "." + "d" * 60 + "." + "d" * 60 + ".com"
    ok = "a" * (254 - len(domain)) + domain
    assert len(ok) == 254
    SubscribeRequest.model_validate({**VALID, "email": ok})
    with pytest.raises(ValidationError):
        SubscribeRequest.model_validate({**VALID, "email": "a" + ok})


def test_the_first_name_may_be_80_characters_and_not_more() -> None:
    SubscribeRequest.model_validate({**VALID, "first_name": "a" * 80})
    with pytest.raises(ValidationError):
        SubscribeRequest.model_validate({**VALID, "first_name": "a" * 81})


def test_the_hidden_field_defaults_to_empty_and_is_capped() -> None:
    assert SubscribeRequest.model_validate(VALID).website == ""
    with pytest.raises(ValidationError):
        SubscribeRequest.model_validate({**VALID, "website": "w" * 1001})


@pytest.mark.parametrize("value", [-1, "soon", 1.5, None])
def test_the_render_time_is_a_whole_number_of_milliseconds(value: object) -> None:
    with pytest.raises(ValidationError):
        SubscribeRequest.model_validate({**VALID, "rendered_at": value})


@pytest.mark.parametrize("field", ["email", "source", "consent_text_version", "rendered_at"])
def test_the_required_fields_cannot_be_left_out(field: str) -> None:
    with pytest.raises(ValidationError):
        SubscribeRequest.model_validate({k: v for k, v in VALID.items() if k != field})


@pytest.mark.parametrize("source", ["", "Landing Hero", "landing-hero", "x" * 41, "a;drop"])
def test_the_source_is_a_short_lowercase_label(source: str) -> None:
    with pytest.raises(ValidationError):
        SubscribeRequest.model_validate({**VALID, "source": source})


def test_the_consent_version_is_a_short_label() -> None:
    SubscribeRequest.model_validate({**VALID, "consent_text_version": "2026-11-v2"})
    with pytest.raises(ValidationError):
        SubscribeRequest.model_validate({**VALID, "consent_text_version": "v" * 21})


def test_the_answer_is_always_the_same_text() -> None:
    assert SubscribeResponse().model_dump() == {"status": "check_your_inbox"}
