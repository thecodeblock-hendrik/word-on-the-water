"""Register our webhook with Kit and keep its signing secret out of sight.

Kit shows the secret once, when the endpoint is created. This saves it straight into the root
.env and never prints it, so it does not end up in a terminal history or a chat.

Usage (from apps/api):
    uv run --env-file ../../.env python -m app.integrations.kit.webhook_endpoint <https url>
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

import httpx

from app.integrations.kit.client import KIT_URL

EVENTS = [
    "subscriber.activated",
    "subscriber.unsubscribed",
    "subscriber.bounced",
    "subscriber.complained",
]
ENV_NAME = "KIT_WEBHOOK_SECRET"


class AlreadyRegisteredError(Exception):
    """Kit never shows a secret again: an existing endpoint must be deleted or rotated in Kit."""


def register_webhook(http: httpx.Client, api_key: str, url: str) -> tuple[int, str]:
    """Create the endpoint for our four events. Returns its id and its signing secret."""
    if urlsplit(url).scheme != "https":
        raise ValueError("The webhook address must be an https URL")
    headers = {"X-Kit-Api-Key": api_key, "Accept": "application/json"}
    listed = http.get(f"{KIT_URL}/webhook_endpoints", headers=headers)
    if listed.status_code == 200 and any(
        endpoint.get("url") == url for endpoint in listed.json().get("webhook_endpoints", [])
    ):
        raise AlreadyRegisteredError(f"{url} is already registered in Kit")
    response = http.post(
        f"{KIT_URL}/webhook_endpoints",
        headers=headers,
        json={"url": url, "events": EVENTS, "name": "Word on the Water subscriber mirror"},
    )
    if response.status_code != 201:
        raise RuntimeError(f"Kit refused the webhook with status {response.status_code}")
    endpoint = response.json()["webhook_endpoint"]
    return int(endpoint["id"]), str(endpoint["secret"])


def save_secret(env_file: Path, secret: str) -> None:
    """Put KIT_WEBHOOK_SECRET in the env file, replacing an old line or adding one."""
    lines = env_file.read_text().splitlines() if env_file.exists() else []
    kept = [line for line in lines if not line.startswith(f"{ENV_NAME}=")]
    index = next((i for i, line in enumerate(lines) if line.startswith(f"{ENV_NAME}=")), None)
    line = f"{ENV_NAME}={secret}"
    if index is None:
        kept.append(line)
    else:
        kept.insert(index, line)
    env_file.write_text("\n".join(kept) + "\n")


def main(url: str) -> int:
    api_key = os.environ.get("KIT_API_KEY")
    if not api_key:
        print("KIT_API_KEY is not set")
        return 2
    try:
        with httpx.Client(timeout=15) as http:
            endpoint_id, secret = register_webhook(http, api_key, url)
    except (ValueError, AlreadyRegisteredError, RuntimeError) as exc:
        print(exc)
        return 1
    save_secret(Path(__file__).resolve().parents[5] / ".env", secret)
    print(
        f"Registered Kit webhook {endpoint_id}. The signing secret is saved in .env as {ENV_NAME}."
    )
    print("Copy it to the API project in Vercel as a Sensitive variable; it is not shown again.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ""))
