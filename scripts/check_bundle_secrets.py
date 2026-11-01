"""Fail if files shipped to browsers contain a secret name, value or secret-shaped string.

Usage: uv run scripts/check_bundle_secrets.py <dir> [<dir> ...]
Exit codes: 0 clean, 1 a leak was found, 2 nothing to scan. Secret values are never printed.
"""

import os
import re
import sys
from pathlib import Path

SECRET_NAMES = [
    "SERVICE_TOKEN",
    "CRON_SECRET",
    "API_BYPASS_SECRET",
    "IP_HASH_SALT",
    "DB_RUNTIME_PASSWORD",
    "DB_MIGRATOR_PASSWORD",
    "DATABASE_URL",
    "REDIS_URL",
    "SENTRY_DSN",
    "KIT_API_KEY",
    "KIT_WEBHOOK_SECRET",
    "POSTMARK_SERVER_TOKEN",
    "TURNSTILE_SECRET",
    "PRAYER_ENCRYPTION_KEY",
]
NAME_PATTERN = re.compile(
    rb"\b(?:" + b"|".join(n.encode() for n in SECRET_NAMES) + rb"|NEON_\w+|UPSTASH_\w+)\b"
)
SHAPES = {
    "Sentry DSN": re.compile(rb"https://\w+@[\w.-]*sentry\.io/\d+"),
    "database URL with a password": re.compile(
        rb"postgres(?:ql)?(?:\+\w+)?://[^\s:/@\"']+:[^\s@\"']+@"
    ),
    "bearer token": re.compile(rb"Bearer [A-Za-z0-9._~+/-]{16,}"),
}
MIN_VALUE_LENGTH = 8


def secret_values() -> list[bytes]:
    names = [*SECRET_NAMES, *(n for n in os.environ if n.startswith(("NEON_", "UPSTASH_")))]
    values = (os.environ.get(name, "") for name in names)
    return [v.encode() for v in values if len(v) >= MIN_VALUE_LENGTH]


def findings(content: bytes, values: list[bytes]) -> list[str]:
    found = [f"secret variable name {m.group().decode()}" for m in NAME_PATTERN.finditer(content)]
    found += [f"{label}" for label, shape in SHAPES.items() if shape.search(content)]
    found += ["the value of a secret environment variable" for v in values if v in content]
    return sorted(set(found))


def main(directories: list[str]) -> int:
    files = [f for d in directories for f in Path(d).rglob("*") if f.is_file()]
    if not files:
        print("Nothing to scan: refusing to pass an empty check.", file=sys.stderr)
        return 2
    values, leaks = secret_values(), 0
    for file in files:
        for finding in findings(file.read_bytes(), values):
            print(f"{file}: {finding}")
            leaks += 1
    print(f"Scanned {len(files)} files, {leaks} finding(s).")
    return 1 if leaks else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
