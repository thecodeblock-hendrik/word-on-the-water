"""Dump the database and encrypt it with age; the plaintext dump never touches the disk.

Usage: uv run scripts/backup_db.py <output file>
Reads BACKUP_DATABASE_URL (libpq URL of a read-only role on the direct, unpooled host) and
AGE_PUBLIC_KEY (an age1... recipient; the private key never comes near this script).
Exit codes: 0 written, 1 the dump or encryption failed (no file is left), 2 refused before
starting (bad settings, or the output exists). Passwords and keys are never printed.
"""

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
PUBLIC_KEY = re.compile(r"^age1[02-9ac-hj-np-z]{58}$")
AGE_HEADER = b"age-encryption.org/v1\n"


class Refused(Exception):
    pass


def check_url(url: str) -> str:
    """Return the URL's password (to scrub from error output); raise Refused if unsafe."""
    if not url:
        raise Refused("BACKUP_DATABASE_URL is not set.")
    parts = urlsplit(url)
    if parts.scheme not in ("postgres", "postgresql"):
        raise Refused("BACKUP_DATABASE_URL must be a postgresql:// URL.")
    host = parts.hostname or ""
    if "-pooler" in host:
        raise Refused("BACKUP_DATABASE_URL uses the pooled host; pg_dump needs the direct one.")
    sslmode = parse_qs(parts.query).get("sslmode", [""])[-1]
    if host not in LOCAL_HOSTS and sslmode != "verify-full":
        raise Refused("BACKUP_DATABASE_URL must set sslmode=verify-full for a remote host.")
    return parts.password or ""


def check_key(key: str) -> None:
    if not key:
        raise Refused("AGE_PUBLIC_KEY is not set.")
    if "SECRET" in key.upper():
        raise Refused("AGE_PUBLIC_KEY holds a private key; store only the age1... public key.")
    if not PUBLIC_KEY.match(key.strip()):
        raise Refused("AGE_PUBLIC_KEY is not an age public key (age1...).")


def tool(name: str) -> str:
    path = shutil.which(name)
    if path is None:
        raise Refused(f"{name} is not installed (scripts/install_backup_tools.sh).")
    return path


def dump(url: str, key: str, output: Path) -> tuple[bool, str]:
    """Pipe pg_dump into age. Returns success and pg_dump's/age's error output."""
    pg_dump_bin, age_bin = tool("pg_dump"), tool("age")
    # Arguments are passed as a list (no shell); the URL and key were checked above.
    pg_dump = subprocess.Popen(  # noqa: S603
        [pg_dump_bin, "--format=custom", "--no-owner", "--no-privileges", f"--dbname={url}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if pg_dump.stdout is None:
        raise RuntimeError("pg_dump has no stdout pipe")
    age = subprocess.run(  # noqa: S603
        [age_bin, "--encrypt", "--recipient", key.strip(), "--output", str(output)],
        stdin=pg_dump.stdout,
        capture_output=True,
        check=False,
    )
    pg_dump.stdout.close()
    dump_errors = pg_dump.stderr.read() if pg_dump.stderr else b""
    pg_dump.wait()
    errors = (dump_errors + age.stderr).decode(errors="replace")
    return pg_dump.returncode == 0 and age.returncode == 0, errors


def main(args: list[str]) -> int:
    if len(args) != 1:
        print(__doc__, file=sys.stderr)
        return 2
    output = Path(args[0])
    url, key = os.environ.get("BACKUP_DATABASE_URL", ""), os.environ.get("AGE_PUBLIC_KEY", "")
    try:
        password = check_url(url)
        check_key(key)
        if output.exists():
            raise Refused(f"{output} already exists; refusing to overwrite it.")
        ok, errors = dump(url, key, output)
    except Refused as refusal:
        print(f"Refused: {refusal}", file=sys.stderr)
        return 2

    if password:
        errors = errors.replace(password, "***")
    with_header = ok and output.exists() and output.read_bytes()[: len(AGE_HEADER)] == AGE_HEADER
    if not with_header:
        output.unlink(missing_ok=True)
        print(f"Backup failed; no file written.\n{errors}".rstrip(), file=sys.stderr)
        return 1
    print(f"Wrote {output} ({output.stat().st_size} bytes, age-encrypted).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
