"""Cloudflare Turnstile: check on the server that a sign-up token came from a solved challenge."""

import httpx

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
# A fault on Cloudflare's side or with our key says nothing about the visitor's token.
FAULTS = {"internal-error", "invalid-input-secret", "missing-input-secret"}


class TurnstileUnavailableError(Exception):
    """Cloudflare or our key is at fault, so the token could not be judged. Retry later."""


class TurnstileVerifier:
    def __init__(self, secret: str, client: httpx.AsyncClient | None = None) -> None:
        self._secret = secret
        self._client = client or httpx.AsyncClient(timeout=5)

    async def verify(self, token: str, remote_ip: str | None) -> bool:
        """True for a token from a solved challenge. A used, expired or invalid token is False."""
        form = {"secret": self._secret, "response": token}
        if remote_ip:
            form["remoteip"] = remote_ip
        try:
            response = await self._client.post(SITEVERIFY_URL, data=form)
        except httpx.HTTPError as exc:
            raise TurnstileUnavailableError("Turnstile could not be reached") from exc
        if response.status_code != 200:
            raise TurnstileUnavailableError(
                f"Turnstile answered with status {response.status_code}"
            )
        result = response.json()
        if result.get("success") is True:
            return True
        if FAULTS & set(result.get("error-codes", [])):
            raise TurnstileUnavailableError("Turnstile reported a fault")
        return False
