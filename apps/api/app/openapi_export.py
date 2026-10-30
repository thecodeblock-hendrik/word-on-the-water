"""Writes the OpenAPI schema to packages/api-types for TypeScript type generation.

Usage: uv run python -m app.openapi_export
"""

import json
import os
from pathlib import Path

OUTPUT_PATH = Path(__file__).resolve().parents[3] / "packages" / "api-types" / "openapi.json"

# The schema does not depend on secrets, so placeholders are enough when none are configured.
PLACEHOLDER_ENV = {
    "DATABASE_URL": "postgresql+asyncpg://placeholder:placeholder@localhost/placeholder",
    "REDIS_URL": "redis://localhost:6379/0",
    "SERVICE_TOKEN": "placeholder",
    "CRON_SECRET": "placeholder",
    "IP_HASH_SALT": "placeholder",
}


def render_schema() -> str:
    for key, value in PLACEHOLDER_ENV.items():
        os.environ.setdefault(key, value)
    from app.main import create_app

    return json.dumps(create_app().openapi(), indent=2, sort_keys=True) + "\n"


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(render_schema())
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
