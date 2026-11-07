import hashlib
import hmac
import json

import pytest
from pydantic import ValidationError

from app.integrations.kit.webhook import verify_signature
from app.schemas.kit_webhook import KitDelivery

SECRET = "whsec_" + "a1b2c3d4" * 4  # the whole string, prefix included, is the HMAC key
NOW = 1_800_000_000.0
BODY = b'{"delivery_id": 1, "events": []}'


def sign(body: bytes, t: int, secret: str = SECRET) -> str:
    return hmac.new(secret.encode(), f"{t}.".encode() + body, hashlib.sha256).hexdigest()


def header(body: bytes = BODY, t: int = int(NOW), secret: str = SECRET, extra: str = "") -> str:
    return f"t={t},v1={sign(body, t, secret)}{extra}"


def docs_reference(raw_body: bytes, header: str, secret: str, now: float) -> bool:
    """Kit's own Python example (webhooks/verifying-signatures in their docs), as the oracle."""
    parts = [p.strip() for p in (header or "").split(",")]
    timestamp = next((p[2:] for p in parts if p.startswith("t=")), None)
    if timestamp is None or abs(now - int(timestamp)) > 300:
        return False
    signed = f"{timestamp}.".encode() + raw_body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(p[3:], expected) for p in parts if p.startswith("v1="))


def test_a_correct_signature_is_accepted() -> None:
    assert verify_signature(header(), BODY, SECRET, NOW) is True


def test_the_secret_is_used_whole_with_its_prefix() -> None:
    assert verify_signature(header(secret="a1b2c3d4" * 4), BODY, SECRET, NOW) is False


def test_a_wrong_secret_is_refused() -> None:
    assert verify_signature(header(), BODY, "whsec_other", NOW) is False


def test_a_changed_body_is_refused_even_by_one_byte() -> None:
    assert verify_signature(header(), BODY + b" ", SECRET, NOW) is False
    assert verify_signature(header(), BODY.replace(b"1", b"2"), SECRET, NOW) is False


def test_a_reserialised_body_is_refused_because_the_raw_bytes_are_signed() -> None:
    pretty = json.dumps(json.loads(BODY), indent=2).encode()
    assert verify_signature(header(), pretty, SECRET, NOW) is False


@pytest.mark.parametrize("value", [None, "", "garbage", "t=,v1=", "v1=abc", "t=abc,v1=abc", "t=1"])
def test_a_missing_or_malformed_header_is_refused(value: str | None) -> None:
    assert verify_signature(value, BODY, SECRET, NOW) is False


def test_the_timestamp_must_be_within_five_minutes_either_way() -> None:
    assert verify_signature(header(t=int(NOW) - 300), BODY, SECRET, NOW) is True
    assert verify_signature(header(t=int(NOW) + 300), BODY, SECRET, NOW) is True
    assert verify_signature(header(t=int(NOW) - 301), BODY, SECRET, NOW) is False
    assert verify_signature(header(t=int(NOW) + 301), BODY, SECRET, NOW) is False


def test_during_a_secret_rotation_any_matching_v1_is_enough() -> None:
    old = sign(BODY, int(NOW), "whsec_old")
    rotated = f"t={int(NOW)},v1={old},v1={sign(BODY, int(NOW))}"
    assert verify_signature(rotated, BODY, SECRET, NOW) is True
    assert verify_signature(f"t={int(NOW)},v1={old},v1={old}", BODY, SECRET, NOW) is False


def test_spaces_around_the_parts_are_tolerated() -> None:
    spaced = f"t={int(NOW)} , v1={sign(BODY, int(NOW))}"
    assert verify_signature(spaced, BODY, SECRET, NOW) is True


def test_non_ascii_junk_in_the_header_is_refused_not_an_error() -> None:
    assert verify_signature(f"t={int(NOW)},v1=café", BODY, SECRET, NOW) is False


@pytest.mark.parametrize("n", range(40))
def test_it_agrees_with_kits_own_reference_example(n: int) -> None:
    body = json.dumps({"n": n, "text": "x" * n}).encode()
    t = int(NOW) + (n - 20) * 30
    candidates = [
        header(body, t),
        header(body, t, "whsec_wrong"),
        header(body, t, extra=",v1=ffff"),
        f"t={t}",
    ]
    for candidate in candidates:
        assert verify_signature(candidate, body, SECRET, NOW) == docs_reference(
            body, candidate, SECRET, NOW
        )


EXAMPLE = {
    "delivery_id": 123456,
    "events": [
        {
            "id": "9c2e1f3a-6b7d-4e8f-a1b2-c3d4e5f60718",
            "type": "subscriber.activated",
            "created": "2026-07-29T14:32:10Z",
            "data": {
                "subscriber": {
                    "id": 987654,
                    "first_name": "Ada",
                    "email_address": "ada@example.com",
                    "state": "active",
                    "created_at": "2026-07-29T14:32:10Z",
                    "fields": {"company": "Kit"},
                }
            },
        }
    ],
}


def test_the_documented_delivery_parses() -> None:
    delivery = KitDelivery.model_validate(EXAMPLE)
    [event] = delivery.events
    assert (event.id, event.type) == (
        "9c2e1f3a-6b7d-4e8f-a1b2-c3d4e5f60718",
        "subscriber.activated",
    )
    assert event.data.subscriber is not None
    assert (event.data.subscriber.id, event.data.subscriber.email_address) == (
        987654,
        "ada@example.com",
    )


def test_fields_we_do_not_use_are_ignored_so_a_new_kit_field_does_not_break_us() -> None:
    delivery = KitDelivery.model_validate({**EXAMPLE, "something_new": 1, "metadata": {}})
    assert len(delivery.events) == 1


def test_an_event_without_a_subscriber_still_parses() -> None:
    delivery = KitDelivery.model_validate(
        {"events": [{"id": "e1", "type": "tag.created", "data": {"tag": {"id": 1}}}]}
    )
    assert delivery.events[0].data.subscriber is None


@pytest.mark.parametrize(
    "bad",
    [
        {},
        {"events": "nope"},
        {"events": [{"type": "x"}]},
        {"events": [{"id": "e"}]},
        {"events": [{}] * 101},
    ],
)
def test_a_delivery_that_is_not_shaped_like_kits_is_refused(bad: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        KitDelivery.model_validate(bad)
