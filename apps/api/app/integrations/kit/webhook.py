"""Checking that a webhook really came from Kit.

Kit signs each delivery: `X-Kit-Signature: t=<unix seconds>,v1=<hex>`, where v1 is the HMAC-SHA256
of `"{t}.{raw body}"` keyed with the endpoint's secret (the whole `whsec_...` string). While a
secret is being rotated the header carries two v1 entries and either may match. The raw bytes are
signed, so the body must be checked before it is parsed.
"""

import hashlib
import hmac

TOLERANCE_SECONDS = 300


def verify_signature(
    header: str | None,
    raw_body: bytes,
    secret: str,
    now: float,
    tolerance: float = TOLERANCE_SECONDS,
) -> bool:
    """True only for a recent, correctly signed delivery. Never raises on a malformed header."""
    parts = [part.strip() for part in (header or "").split(",")]
    timestamp = next((part[2:] for part in parts if part.startswith("t=")), None)
    if timestamp is None:
        return False
    try:
        age = abs(now - int(timestamp))
    except ValueError:
        return False
    if age > tolerance:
        return False
    signed = f"{timestamp}.".encode() + raw_body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest().encode()
    return any(
        hmac.compare_digest(part[3:].encode(), expected) for part in parts if part.startswith("v1=")
    )
