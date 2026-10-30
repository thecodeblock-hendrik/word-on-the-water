"""Create a working local .env from .env.example. Never overwrites an existing file.

Usage: uv run scripts/setup_env.py <example> <target>
"""

import secrets
import sys
from pathlib import Path

LOCAL_VALUES = {
    "DATABASE_URL": "postgresql+asyncpg://app_runtime:runtime_local@localhost:5432/wotw",
    "DATABASE_URL_DIRECT": "postgresql+asyncpg://app_migrator:migrator_local@localhost:5432/wotw",
    "REDIS_URL": "redis://localhost:6379/0",
    "API_BASE_URL": "http://localhost:8000",
    "EMAIL_PROVIDER": "smtp",
    "SMTP_HOST": "localhost",
    "SMTP_PORT": "1025",
}
GENERATED = {"SERVICE_TOKEN", "CRON_SECRET", "IP_HASH_SALT"}


def fill(line: str) -> str:
    key, sep, _ = line.partition("=")
    if not sep:
        return line
    if key in GENERATED:
        return f"{key}={secrets.token_urlsafe(32)}"
    if key in LOCAL_VALUES:
        return f"{key}={LOCAL_VALUES[key]}"
    return line


def main(example: Path, target: Path) -> None:
    if target.exists():
        print(f"{target} already exists, leaving it unchanged")
        return
    lines = [fill(line) for line in example.read_text().splitlines()]
    target.write_text("\n".join(lines) + "\n")
    print(f"Created {target}")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
